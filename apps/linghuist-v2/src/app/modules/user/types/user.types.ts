export type GetAllUsersFilters = {
  known?: string;
  learning?: string;
};

export type UploadedImageFile = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};
