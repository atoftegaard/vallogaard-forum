export interface ArticleListConfig {
  type: string;

  filters: {
    shallow?: string,
    tag?: string,
    author?: string,
    favorited?: string,
    limitToFirst?: number,
    startAt?: number,
    orderBy?: string
  };
}
