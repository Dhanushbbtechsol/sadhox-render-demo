import { BookOpenIcon, MoreHorizontal, PlusIcon, TagsIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

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

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories.data ?? []) {
      map.set(category.id, category.name);
    }
    return map;
  }, [categories.data]);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <BookOpenIcon className="size-5" />
            Knowledge
          </h1>
          <p className="text-sm text-muted-foreground">
            Admin authoring for knowledge articles and categories (Dev D API or DEV mocks).
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

      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title or body"
          className="md:max-w-xs"
        />
        <Select
          value={categoryId}
          onValueChange={(value) => setCategoryId(value as string | "all")}
        >
          <SelectTrigger className="w-full md:w-52">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories.data ?? []).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as KnowledgeArticleStatus | "all")}
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

      {(categories.data?.length ?? 0) > 0 ? (
        <div className="flex flex-wrap gap-2">
          {(categories.data ?? []).map((category) => (
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

      {articles.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : null}

      {articles.isError ? (
        <p className="text-destructive text-sm">
          {articles.error instanceof Error ? articles.error.message : "Failed to load articles"}
        </p>
      ) : null}

      {articles.data ? (
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
              {articles.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center text-sm">
                    No articles match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                articles.data.map((article) => (
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

      <KnowledgeCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
      />
    </div>
  );
}
