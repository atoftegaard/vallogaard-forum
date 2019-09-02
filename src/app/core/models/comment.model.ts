import { Profile } from './profile.model';

export interface Comment {
  slug: string;
  id: number;
  body: string;
  createdAt: string;
  author: Profile;
}
