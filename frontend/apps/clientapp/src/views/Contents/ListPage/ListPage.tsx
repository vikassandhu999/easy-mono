import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Stack, Alert, Text, Drawer } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import {
  useContentMutations,
  useContents,
  useContent,
} from "@/Hooks/useContentsQueries";
import {
  CreateContentProps,
  UpdateContentProps,
  ContentsAPI,
  Content,
  CONTENT_TYPES,
} from "@/Api/Contents";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { ContentForm } from "@/Components/ContentForm";
import ContentListItem from "./ContentListItem";
import ContentHeader from "./ContentHeader";
import { EmptyState } from "./EmptyState";
import RecordsList from "@/Components/Layouts/RecordsList";
import PagePaper from "@/Components/Containers/PagePaper";
import PaddingContainer from "@/Components/Containers/PaddingContainer";
import { modals } from "@mantine/modals";

function ContentListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");

  const contentType = searchParams.get("type");

  // Drawer states
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useContents({
      search: search?.trim(),
      include_tags: true,
      page_size: 20,
      content_type: contentType || undefined,
    });

  const { deleteContent, togglePublish } = useContentMutations();
  const { data: editingContent, isLoading: editingContentLoading } =
    useContent(editingContentId);

  // Content creation mutation
  const createContentMutation = useMutation({
    mutationFn: async (data: CreateContentProps) => {
      const result = await ContentsAPI.createContent(data);
      if (result.isError) {
        throw result.getError();
      }
      return result.getValue();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      notifications.show({
        title: "Success",
        message: "Content created successfully",
        color: "green",
        autoClose: 1000,
      });
      setCreateDrawerOpen(false);
      navigate(`/content/${data.id}`);
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Failed to create content",
        color: "red",
        autoClose: 1000,
      });
    },
  });

  // Content update mutation
  const updateContentMutation = useMutation({
    mutationFn: async (data: UpdateContentProps) => {
      const result = await ContentsAPI.updateContent(editingContentId!, data);
      if (result.isError) {
        throw result.getError();
      }
      return result.getValue();
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["content", editingContentId], data);
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      notifications.show({
        title: "Success",
        message: `"${variables.name || "Content"}" updated successfully`,
        color: "green",
        autoClose: 1000,
      });
      setEditDrawerOpen(false);
      setEditingContentId(null);
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Failed to update content",
        color: "red",
        autoClose: 1000,
      });
    },
  });

  const allContents = useMemo(
    () => data?.pages.flatMap((page) => page.records) ?? [],
    [data]
  );
  const totalContents = data?.pages[0]?.total ?? 0;

  const handleEdit = (id: string) => {
    setEditingContentId(id);
    setEditDrawerOpen(true);
  };

  const handleView = (id: string) => navigate(`/content/${id}`);

  const handleCreate = () => {
    setCreateDrawerOpen(true);
  };

  const handleDelete = (contentId: string) => {
    const content = allContents.find((c) => c.id === contentId);
    if (!content) return;

    modals.openConfirmModal({
      title: "Delete Content",
      children: (
        <Stack gap="sm">
          <Text size="sm">
            Are you sure you want to delete "{content.name}"?
          </Text>
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            <Text size="sm">
              This action cannot be undone. The content will be permanently
              removed.
            </Text>
          </Alert>
        </Stack>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => deleteContent(contentId),
    });
  };

  const handleTogglePublish = (contentId: string) => {
    togglePublish(contentId);
  };

  return (
    <PagePaper>
      {/* Header with consistent padding */}
      <ContentHeader
        totalContents={totalContents}
        title={CONTENT_TYPES.find((ct) => ct.value === contentType)?.label}
        onSearchChange={(value) => setSearch(value)}
        onCreateContent={handleCreate}
        isLoading={isLoading}
      />

      <PaddingContainer paddingX={"lg"} paddingY={"md"}>
        <RecordsList<Content>
          gap="sm"
          records={allContents}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={isFetchingNextPage}
          renderItem={(content) => (
            <ContentListItem
              key={content.id}
              content={content}
              onEdit={handleEdit}
              onView={handleView}
              onDelete={handleDelete}
              onTogglePublish={handleTogglePublish}
            />
          )}
          emptyState={
            <EmptyState search={search} onCreateContent={handleCreate} />
          }
          loadMoreText="Load More Content"
          itemKey={(item) => item.id}
        />
      </PaddingContainer>

      {/* Create Content Drawer */}
      <Drawer
        opened={createDrawerOpen}
        withCloseButton={false}
        onClose={() => setCreateDrawerOpen(false)}
        position="right"
        size={"100%"}
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        transitionProps={{ transition: "slide-left", duration: 200 }}
      >
        <ContentForm
          mode="create"
          onSubmit={(data) => createContentMutation.mutate(data)}
          onCancel={() => setCreateDrawerOpen(false)}
          isSubmitting={createContentMutation.isPending}
        />
      </Drawer>

      {/* Edit Content Drawer */}
      <Drawer
        opened={editDrawerOpen}
        onClose={() => {
          setEditDrawerOpen(false);
          setEditingContentId(null);
        }}
        withCloseButton={false}
        position="right"
        size={"100%"}
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        transitionProps={{ transition: "slide-left", duration: 200 }}
      >
        {editingContent && !editingContentLoading && (
          <ContentForm
            mode="edit"
            initialData={editingContent}
            onSubmit={(data) => updateContentMutation.mutate(data)}
            onCancel={() => {
              setEditDrawerOpen(false);
              setEditingContentId(null);
            }}
            isSubmitting={updateContentMutation.isPending}
          />
        )}
      </Drawer>
    </PagePaper>
  );
}

export default ContentListPage;
