import {
  BookOpenIcon,
  MoreHorizontal,
  PlusIcon,
  SearchIcon,
  TagsIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useDeleteKnowledgeArticle,
  useDeleteKnowledgeCategory,
  useKnowledgeArticles,
  useKnowledgeCategories,
} from "@/features/admin/hooks";
import type {
  KnowledgeArticle,
  KnowledgeArticleStatus,
  KnowledgeCategory,
} from "@/features/admin/types";

import { KnowledgeCategoryDialog } from "./knowledge-category-dialog";

const STATUSES: Array<KnowledgeArticleStatus | "all"> = ["all", "Draft", "Published"];

function articleSnippet(body: string) {
  const plain = body.replace(/\*\*/g, "");
  return plain.slice(0, 140) + (plain.length > 140 ? "…" : "");
}

export default function KnowledgeListPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [status, setStatus] = useState<KnowledgeArticleStatus | "all">("all");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<KnowledgeCategory | null>(null);

  const categories = useKnowledgeCategories();
  const articles = useKnowledgeArticles({ q: query, categoryId, status });
  const deleteArticle = useDeleteKnowledgeArticle();
  const deleteCategory = useDeleteKnowledgeCategory();

  const categoryList = Array.isArray(categories.data) ? categories.data : [];
  const rows = Array.isArray(articles.data) ? articles.data : [];

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categoryList) {
      map.set(category.id, category.name);
    }
    return map;
  }, [categoryList]);

  async function handleDeleteArticle(article: KnowledgeArticle) {
    try {
      await deleteArticle.mutateAsync(article.id);
      toast.success(`Deleted “${article.title}”`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  async function handleDeleteCategory(category: KnowledgeCategory) {
    try {
      await deleteCategory.mutateAsync(category.id);
      toast.success(`Deleted category “${category.name}”`);
      if (categoryId === category.id) setCategoryId("all");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  const isLoading = articles.isLoading || categories.isLoading;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between animate-in-up">
        <div className="min-w-0 space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <BookOpenIcon className="size-5" />
            Knowledge Base
          </h1>
          <p className="text-muted-foreground text-sm">
            Browse how-to articles and manage drafts, categories, and publishing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditingCategory(null);
              setCategoryDialogOpen(true);
            }}
          >
            <TagsIcon />
            New category
          </Button>
          <Button render={<Link to="/admin/knowledge/new" />}>
            <PlusIcon />
            New article
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap animate-in-up">
        <div className="relative md:max-w-xs md:flex-1">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title or body"
            className="pl-9"
            aria-label="Search knowledge articles"
          />
        </div>
        <Select
          items={[
            { value: "all", label: "All categories" },
            ...categoryList.map((category) => ({
              value: category.id,
              label: category.name,
            })),
          ]}
          value={categoryId}
          onValueChange={(value) => setCategoryId((value as string | "all") ?? "all")}
        >
          <SelectTrigger className="w-full md:w-52">
            <SelectValue placeholder="Category">
              {(value) => {
                if (!value || value === "all") return "All categories";
                return (
                  categoryList.find((c) => c.id === value)?.name ?? "Category"
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categoryList.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={STATUSES.map((item) => ({
            value: item,
            label: item === "all" ? "All statuses" : item,
          }))}
          value={status}
          onValueChange={(value) =>
            setStatus((value as KnowledgeArticleStatus | "all") ?? "all")
          }
        >
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {item === "all" ? "All statuses" : item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {categoryList.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {categoryList.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
            >
              <span className="font-medium">{category.name}</span>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="h-6 px-1.5"
                onClick={() => {
                  setEditingCategory(category);
                  setCategoryDialogOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="h-6 px-1.5 text-destructive"
                onClick={() => void handleDeleteCategory(category)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {articles.isError ? (
        <p className="text-destructive text-sm">
          {articles.error instanceof Error ? articles.error.message : "Failed to load articles"}
        </p>
      ) : null}

      <Tabs defaultValue="browse" className="gap-4">
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : null}

          {!isLoading && !articles.isError && rows.length === 0 ? (
            <EmptyState
              title="No articles found"
              description={
                query.trim() || categoryId !== "all" || status !== "all"
                  ? "Try a different search term or filter."
                  : "Create an article to start the knowledge base."
              }
              action={
                <Button render={<Link to="/admin/knowledge/new" />}>
                  <PlusIcon />
                  New article
                </Button>
              }
            />
          ) : null}

          {!isLoading && rows.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {rows.map((article, index) => (
                <li key={article.id} className={index === 1 ? "stagger-1" : undefined}>
                  <div className="border-border/80 bg-card hover:border-primary/25 hover:shadow-lift group relative flex h-full flex-col gap-2 rounded-xl border p-4 shadow-soft transition-all duration-200 animate-in-up">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/knowledge/${article.slug}`}
                        className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg"
                        aria-label={`Read ${article.title}`}
                      >
                        <BookOpenIcon className="size-4" />
                      </Link>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Badge variant="outline">
                          {article.categoryId
                            ? (categoryNameById.get(article.categoryId) ?? "—")
                            : "—"}
                        </Badge>
                        <Badge
                          variant={article.status === "Published" ? "success" : "warning"}
                        >
                          {article.status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                aria-label="Article actions"
                              />
                            }
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/knowledge/${article.slug}`)}
                            >
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/admin/knowledge/${article.id}`)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => void handleDeleteArticle(article)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <Link
                      to={`/knowledge/${article.slug}`}
                      className="group-hover:text-primary text-sm font-semibold tracking-tight transition-colors"
                    >
                      {article.title}
                    </Link>
                    <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                      {articleSnippet(article.body)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </TabsContent>

        <TabsContent value="manage">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : null}

          {!isLoading && articles.isSuccess ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-muted-foreground text-center text-sm"
                      >
                        No articles match these filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((article) => (
                      <TableRow key={article.id}>
                        <TableCell>
                          <Link
                            to={`/admin/knowledge/${article.id}`}
                            className="font-medium hover:underline"
                          >
                            {article.title}
                          </Link>
                          <p className="text-muted-foreground text-xs">{article.slug}</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {article.categoryId
                            ? (categoryNameById.get(article.categoryId) ?? "—")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={article.status === "Published" ? "success" : "secondary"}
                          >
                            {article.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(article.updatedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  aria-label="Article actions"
                                />
                              }
                            >
                              <MoreHorizontal />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => navigate(`/knowledge/${article.slug}`)}
                              >
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate(`/admin/knowledge/${article.id}`)}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => void handleDeleteArticle(article)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      <KnowledgeCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
      />
    </div>
  );
}
