/** Page size for GET /user/all/:page discovery list. */
export const USERS_PAGE_SIZE = 40;

export const PROFILE_PICTURES_BUCKET = 'profilePictures';
export const USER_THUMBNAILS_BUCKET = 'userThumbnails';

// Request payload cap before server-side conversion to WebP.
export const AVATAR_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_PICTURE_MAX_BYTES = 250 * 1024;
export const USER_THUMBNAIL_MAX_BYTES = 1024;

export const USER_NOTIFICATIONS_DEFAULT_PAGE_SIZE = 20;

/** Timeline page size for GET /user/posts/feed. */
export const FEED_PAGE_SIZE = 20;
export const POST_CONTENT_MAX_LENGTH = 8000;
export const COMMENT_CONTENT_MAX_LENGTH = 2000;
export const COMMENTS_PAGE_SIZE = 30;
