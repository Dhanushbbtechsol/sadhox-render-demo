import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  slugifyTitle,
  useCreateKnowledgeArticle,
  useKnowledgeArticle,
  useKnowledgeCategories,
  useUpdateKnowledgeArticle,
} from "@/features/admin/hooks";
import type { KnowledgeArticleStatus } from "@/features/admin/types";

import { MarkdownPreview } from "./markdown-preview";

const schema = z.object({
  title: z.string().min(2).max(200),
  slug: z.string().min(1).max(120),
  body: z.string().min(1),
  status: z.enum(["Draft", "Published"]),
  categoryId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function KnowledgeArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === "new";
  const articleQuery = useKnowledgeArticle(isNew ? undefined : id);
  const categories = useKnowledgeCategories();
  const createArticle = useCreateKnowledgeArticle();
  const updateArticle = useUpdateKnowledgeArticle();
  const [slugTouched, setSlugTouched] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      slug: "",
      body: "",
      status: "Draft",
      categoryId: "none",
    },
  });

  useEffect(() => {
    if (isNew) {
      form.reset({
        title: "",
        slug: "",
        body: "",
        status: "Draft",
        categoryId: "none",
      });
      setSlugTouched(false);
      return;
    }
    if (!articleQuery.data) return;
    form.reset({
      title: articleQuery.data.title,
      slug: articleQuery.data.slug,
      body: articleQuery.data.body,
      status: articleQuery.data.status,
      categoryId: articleQuery.data.categoryId ?? "none",
    });
    setSlugTouched(true);
  }, [isNew, articleQuery.data, form]);

  const bodyValue = form.watch("body");
  const titleValue = form.watch("title");

  useEffect(() => {
    if (!slugTouched && isNew && titleValue) {
      form.setValue("slug", slugifyTitle(titleValue));
    }
  }, [titleValue, slugTouched, isNew, form]);

  async function onSubmit(values: FormValues) {
    const payload = {
      title: values.title,
      slug: values.slug.trim() || slugifyTitle(values.title),
      body: values.body,
      status: values.status as KnowledgeArticleStatus,
      categoryId: values.categoryId === "none" ? null : values.categoryId,
    };

    try {
      if (isNew) {
        const created = await createArticle.mutateAsync(payload);
        toast.success(
          created.status === "Published" ? "Article published" : "Draft saved",
        );
        navigate(`/admin/knowledge/${created.id}`, { replace: true });
      } else if (id) {
        await updateArticle.mutateAsync({ id, input: payload });
        toast.success(
          payload.status === "Published" ? "Article published" : "Article updated",
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    }
  }

  const pending = createArticle.isPending || updateArticle.isPending;

  if (!isNew && articleQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!isNew && articleQuery.isError) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" render={<Link to="/admin/knowledge" />}>
          <ArrowLeftIcon />
          Back
        </Button>
        <p className="text-destructive text-sm">
          {articleQuery.error instanceof Error
            ? articleQuery.error.message
            : "Article not found"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 w-fit"
            render={<Link to="/admin/knowledge" />}
          >
            <ArrowLeftIcon />
            Back to Knowledge
          </Button>
          <h1 className="text-xl font-semibold">
            {isNew ? "New article" : "Edit article"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              form.setValue("status", "Draft");
              void form.handleSubmit(onSubmit)();
            }}
          >
            Save draft
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              form.setValue("status", "Published");
              void form.handleSubmit(onSubmit)();
            }}
          >
            {pending ? "Saving…" : "Publish"}
          </Button>
        </div>
      </div>

      <form className="grid gap-6 lg:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ka-title">Title</Label>
            <Input id="ka-title" {...form.register("title")} />
            {form.formState.errors.title ? (
              <p className="text-destructive text-xs">{form.formState.errors.title.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ka-slug">Slug</Label>
            <Input
              id="ka-slug"
              {...form.register("slug")}
              onChange={(event) => {
                setSlugTouched(true);
                form.setValue("slug", event.target.value);
              }}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value ?? "none"} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Uncategorized</SelectItem>
                      {(Array.isArray(categories.data) ? categories.data : []).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ka-body">Body (markdown or plain text)</Label>
            <Textarea
              id="ka-body"
              rows={18}
              className="font-mono text-sm"
              {...form.register("body")}
            />
            {form.formState.errors.body ? (
              <p className="text-destructive text-xs">{form.formState.errors.body.message}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="min-h-96 rounded-lg border bg-muted/20 p-4">
            <MarkdownPreview body={bodyValue ?? ""} />
          </div>
        </div>
      </form>
    </div>
  );
}
