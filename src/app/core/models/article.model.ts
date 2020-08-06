import { Profile } from './profile.model';

export interface Article {
  slug: string;
  title: string;
  body: string;
  createdAt?: string;
  updatedAt?: string;
  author?: Profile;
  sticky: boolean;
}
