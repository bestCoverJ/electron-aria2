import { Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDownloads } from "@/hooks/use-downloads";
import { normalizeUserError } from "@/lib/tide-api";
import { DirectoryField, Modal, SourceField } from "./shared";

export function AddDownloadDialog({
  defaultDirectory,
  recentDirectories,
  onClose,
  onSelectDirectory,
  onSubmit,
}: {
  defaultDirectory: string;
  recentDirectories: string[];
  onClose: () => void;
  onSelectDirectory: ReturnType<
    typeof useDownloads
  >["actions"]["selectDirectory"];
  onSubmit: (source: string, directory: string) => Promise<void>;
}) {
  const [source, setSource] = useState("");
  const [directory, setDirectory] = useState(defaultDirectory);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!source.trim()) {
      setError("请输入 HTTP/HTTPS、Magnet、torrent 或 Metalink。");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(source, directory);
    } catch (caught) {
      setError(normalizeUserError(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} title="新建下载任务">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <SourceField error={error} onChange={setSource} value={source} />
        <DirectoryField
          label="保存目录"
          onBrowse={onSelectDirectory}
          onChange={setDirectory}
          recentDirectories={recentDirectories}
          value={directory}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="outline">
            取消
          </Button>
          <Button disabled={isSubmitting} type="submit">
            <Plus aria-hidden="true" size={14} />
            添加
          </Button>
        </div>
      </form>
    </Modal>
  );
}
