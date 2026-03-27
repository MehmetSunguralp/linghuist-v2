export class SocialAuthorDto {
  id!: string;
  username!: string | null;
  name!: string | null;
  thumbnailUrl!: string | null;
}

export class FeedPostItemDto {
  id!: string;
  content!: string;
  imageUrl!: string | null;
  createdAt!: Date;
  author!: SocialAuthorDto;
  likeCount!: number;
  commentCount!: number;
  likedByMe!: boolean;
}

export class FeedDataDto {
  posts!: FeedPostItemDto[];
  page!: number;
  pageSize!: number;
  total!: number;
  totalPages!: number;
  hasNextPage!: boolean;
}

export class GetFeedResponseEnvelopeDto {
  message!: string;
  data!: FeedDataDto;
}

export class PostDetailDto extends FeedPostItemDto {}

export class GetPostResponseEnvelopeDto {
  message!: string;
  data!: { post: PostDetailDto };
}

export class CommentItemDto {
  id!: string;
  postId!: string;
  content!: string;
  createdAt!: Date;
  author!: SocialAuthorDto;
}

export class CommentsListDataDto {
  comments!: CommentItemDto[];
  page!: number;
  pageSize!: number;
  total!: number;
  totalPages!: number;
  hasNextPage!: boolean;
}

export class GetCommentsResponseEnvelopeDto {
  message!: string;
  data!: CommentsListDataDto;
}
