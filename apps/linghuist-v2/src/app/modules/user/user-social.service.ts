import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@linghuist-v2/prisma';
import type { ApiEnvelope } from '../../common/api-envelope.types';
import type { CreateCommentDto } from './dto/create_comment.dto';
import type { CreatePostDto } from './dto/create_post.dto';
import type { UpdatePostDto } from './dto/update_post.dto';
import type {
  CommentItemDto,
  FeedPostItemDto,
  GetCommentsResponseEnvelopeDto,
  GetFeedResponseEnvelopeDto,
  GetPostResponseEnvelopeDto,
} from './dto/social_feed_response.dto';
import { UserNotificationService } from './user-notification.service';
import { COMMENTS_PAGE_SIZE, FEED_PAGE_SIZE } from './user.constants';

const authorSelect = {
  id: true,
  username: true,
  name: true,
  thumbnailUrl: true,
} as const;

@Injectable()
export class UserSocialService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userNotificationService: UserNotificationService,
  ) {}

  /** Users the viewer must not see content from (either direction block). */
  private async getExcludedAuthorIdsForViewer(viewerId: string): Promise<string[]> {
    const rows = await this.prismaService.block.findMany({
      where: {
        OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
      },
      select: { blockerId: true, blockedId: true },
    });
    const excluded = new Set<string>();
    for (const row of rows) {
      excluded.add(row.blockerId === viewerId ? row.blockedId : row.blockerId);
    }
    return [...excluded];
  }

  private async assertPostViewable(viewerId: string, post: { authorId: string }): Promise<void> {
    const excluded = await this.getExcludedAuthorIdsForViewer(viewerId);
    if (excluded.includes(post.authorId)) {
      throw new NotFoundException('Post not found');
    }
  }

  private mapToFeedPost(row: {
    id: string;
    content: string;
    imageUrl: string | null;
    createdAt: Date;
    author: { id: string; username: string | null; name: string | null; thumbnailUrl: string | null };
    _count: { likes: number; comments: number };
    likes: { id: string }[];
  }): FeedPostItemDto {
    return {
      id: row.id,
      content: row.content,
      imageUrl: row.imageUrl,
      createdAt: row.createdAt,
      author: row.author,
      likeCount: row._count.likes,
      commentCount: row._count.comments,
      likedByMe: row.likes.length > 0,
    };
  }

  private postListSelect(viewerId: string) {
    return {
      id: true,
      content: true,
      imageUrl: true,
      createdAt: true,
      author: { select: authorSelect },
      _count: { select: { likes: true, comments: true } },
      likes: {
        where: { userId: viewerId },
        select: { id: true },
        take: 1,
      },
    } as const;
  }

  async getFeed(userId: string, page: number, pageSize?: number): Promise<GetFeedResponseEnvelopeDto> {
    const normalizedPageSize = Math.min(Math.max(1, Math.floor(pageSize ?? FEED_PAGE_SIZE)), 50);
    const normalizedPage = Math.max(1, Math.floor(page));
    const excluded = await this.getExcludedAuthorIdsForViewer(userId);
    const where = excluded.length > 0 ? { authorId: { notIn: excluded } } : {};

    const [total, rows] = await this.prismaService.$transaction([
      this.prismaService.post.count({ where }),
      this.prismaService.post.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (normalizedPage - 1) * normalizedPageSize,
        take: normalizedPageSize,
        select: this.postListSelect(userId),
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));

    return {
      message: 'Feed retrieved successfully',
      data: {
        posts: rows.map((row) => this.mapToFeedPost(row)),
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total,
        totalPages,
        hasNextPage: normalizedPage < totalPages,
      },
    };
  }

  async getPostById(userId: string, postId: string): Promise<GetPostResponseEnvelopeDto> {
    const post = await this.prismaService.post.findUnique({
      where: { id: postId },
      select: { authorId: true, ...this.postListSelect(userId) },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    await this.assertPostViewable(userId, post);
    const { authorId: _authorId, ...row } = post;
    return {
      message: 'Post retrieved successfully',
      data: {
        post: this.mapToFeedPost(row),
      },
    };
  }

  async createPost(userId: string, dto: CreatePostDto): Promise<GetPostResponseEnvelopeDto> {
    const created = await this.prismaService.post.create({
      data: {
        authorId: userId,
        content: dto.content.trim(),
        imageUrl: dto.imageUrl?.trim() || null,
      },
      select: this.postListSelect(userId),
    });
    return {
      message: 'Post created successfully',
      data: { post: this.mapToFeedPost(created) },
    };
  }

  async updatePost(userId: string, postId: string, dto: UpdatePostDto): Promise<GetPostResponseEnvelopeDto> {
    const post = await this.prismaService.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }
    await this.assertPostViewable(userId, post);

    const data: { content?: string; imageUrl?: string | null } = {};
    if (dto.content !== undefined) {
      data.content = dto.content.trim();
    }
    if (dto.imageUrl !== undefined) {
      const t = dto.imageUrl.trim();
      data.imageUrl = t.length > 0 ? t : null;
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No changes provided');
    }

    await this.prismaService.post.update({
      where: { id: postId },
      data,
    });

    const updated = await this.prismaService.post.findUniqueOrThrow({
      where: { id: postId },
      select: this.postListSelect(userId),
    });
    return {
      message: 'Post updated successfully',
      data: { post: this.mapToFeedPost(updated) },
    };
  }

  async deletePost(userId: string, postId: string): Promise<ApiEnvelope<null>> {
    const post = await this.prismaService.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.prismaService.post.delete({ where: { id: postId } });
    return { message: 'Post deleted successfully', data: null };
  }

  async likePost(
    userId: string,
    postId: string,
  ): Promise<ApiEnvelope<{ liked: true; likeCount: number; postAuthorId: string }>> {
    const post = await this.prismaService.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    await this.assertPostViewable(userId, post);

    const already = await this.prismaService.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
      select: { id: true },
    });
    if (already) {
      throw new BadRequestException('Already liked this post');
    }
    await this.prismaService.like.create({
      data: { postId, userId },
    });
    if (post.authorId !== userId) {
      await this.userNotificationService.notifyPostLiked(post.authorId, userId, postId);
    }

    const likeCount = await this.prismaService.like.count({ where: { postId } });
    return {
      message: 'Post liked',
      data: { liked: true, likeCount, postAuthorId: post.authorId },
    };
  }

  async unlikePost(userId: string, postId: string): Promise<ApiEnvelope<{ liked: false; likeCount: number }>> {
    const post = await this.prismaService.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    await this.assertPostViewable(userId, post);

    const deleted = await this.prismaService.like.deleteMany({
      where: { postId, userId },
    });
    if (deleted.count === 0) {
      throw new BadRequestException('Post is not liked');
    }

    const likeCount = await this.prismaService.like.count({ where: { postId } });
    return { message: 'Like removed', data: { liked: false, likeCount } };
  }

  async listComments(
    userId: string,
    postId: string,
    page: number,
    pageSize?: number,
  ): Promise<GetCommentsResponseEnvelopeDto> {
    const normalizedPageSize = Math.min(Math.max(1, Math.floor(pageSize ?? COMMENTS_PAGE_SIZE)), 50);
    const normalizedPage = Math.max(1, Math.floor(page));

    const post = await this.prismaService.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    await this.assertPostViewable(userId, post);

    const where = { postId };
    const [total, rows] = await this.prismaService.$transaction([
      this.prismaService.comment.count({ where }),
      this.prismaService.comment.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (normalizedPage - 1) * normalizedPageSize,
        take: normalizedPageSize,
        select: {
          id: true,
          postId: true,
          content: true,
          createdAt: true,
          author: { select: authorSelect },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
    const comments: CommentItemDto[] = rows.map((row) => ({
      id: row.id,
      postId: row.postId,
      content: row.content,
      createdAt: row.createdAt,
      author: row.author,
    }));

    return {
      message: 'Comments retrieved successfully',
      data: {
        comments,
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total,
        totalPages,
        hasNextPage: normalizedPage < totalPages,
      },
    };
  }

  async createComment(
    userId: string,
    postId: string,
    dto: CreateCommentDto,
  ): Promise<ApiEnvelope<{ comment: CommentItemDto; postAuthorId: string }>> {
    const post = await this.prismaService.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    await this.assertPostViewable(userId, post);

    const created = await this.prismaService.comment.create({
      data: {
        postId,
        authorId: userId,
        content: dto.content.trim(),
      },
      select: {
        id: true,
        postId: true,
        content: true,
        createdAt: true,
        author: { select: authorSelect },
      },
    });

    if (post.authorId !== userId) {
      await this.userNotificationService.notifyPostCommented(post.authorId, userId, postId, created.id);
    }

    const comment: CommentItemDto = {
      id: created.id,
      postId: created.postId,
      content: created.content,
      createdAt: created.createdAt,
      author: created.author,
    };

    return { message: 'Comment created', data: { comment, postAuthorId: post.authorId } };
  }

  async deleteComment(userId: string, commentId: string): Promise<ApiEnvelope<null>> {
    const comment = await this.prismaService.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, postId: true },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    const post = await this.prismaService.post.findUnique({
      where: { id: comment.postId },
      select: { authorId: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    await this.assertPostViewable(userId, post);
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prismaService.comment.delete({ where: { id: commentId } });
    return { message: 'Comment deleted successfully', data: null };
  }
}
