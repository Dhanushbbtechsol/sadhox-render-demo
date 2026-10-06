import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

export const KNOWLEDGE_LINK_TICKET_TYPES = [
  "incident",
  "problem",
  "service_request",
] as const;

export type KnowledgeLinkTicketType =
  (typeof KNOWLEDGE_LINK_TICKET_TYPES)[number];

export const KNOWLEDGE_ARTICLE_STATUSES = ["Draft", "Published"] as const;

export type KnowledgeArticleStatusDto =
  (typeof KNOWLEDGE_ARTICLE_STATUSES)[number];

export class ListArticlesQueryDto {
  @ApiPropertyOptional({ description: "Search title and body" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class CreateCategoryDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  slug!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}

export class CreateArticleDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  slug!: string;

  @ApiProperty({ maxLength: 50000 })
  @IsString()
  @MinLength(1)
  @MaxLength(50000)
  body!: string;

  @ApiProperty({ enum: KNOWLEDGE_ARTICLE_STATUSES })
  @IsIn(KNOWLEDGE_ARTICLE_STATUSES)
  status!: KnowledgeArticleStatusDto;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  categoryId!: string;
}

export class UpdateArticleDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional({ maxLength: 50000 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50000)
  body?: string;

  @ApiPropertyOptional({ enum: KNOWLEDGE_ARTICLE_STATUSES })
  @IsOptional()
  @IsIn(KNOWLEDGE_ARTICLE_STATUSES)
  status?: KnowledgeArticleStatusDto;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class LinkArticleDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  articleId!: string;
}
