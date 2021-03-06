import { Profile } from './profile.model';
import { SimpleProfile } from './simple-profile.model';

export interface Article {
  id: string;
  slug: string;
  title: string;
  body: string;
  createdAt?: string;
  updatedAt?: Date;
  author?: Profile;
  sticky: boolean;
  comments: SimpleProfile[];
  views: Map<string, SimpleProfile>;
  watchers: Map<string, SimpleProfile>;
}
