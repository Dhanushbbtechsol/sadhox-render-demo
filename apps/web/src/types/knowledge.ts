/** Contract types aligned with Nest Knowledge API (Phase 5). */

export type KnowledgeArticleStatus = "Draft" | "Published";

export type KnowledgeLinkTicketType =
  | "incident"
  | "problem"
  | "service_request";

export interface KnowledgeCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  body: string;
  status: KnowledgeArticleStatus;
  categoryId: string;
  categoryName?: string;
  categorySlug?: string;
  authorId: string;
  authorName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeArticleSnippet {
  id: string;
  title: string;
  slug: string;
  status: KnowledgeArticleStatus;
}

export interface TicketKnowledgeLink {
  id: string;
  ticketId: string;
  ticketType: KnowledgeLinkTicketType;
  articleId: string;
  createdAt: string;
  article: KnowledgeArticleSnippet;
}
