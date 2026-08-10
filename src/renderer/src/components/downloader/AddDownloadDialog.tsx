import { Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDownloads } from "@/hooks/use-downloads";
import { normalizeUserError } from "@/lib/tide-api";
import { DirectoryField, Modal, SourceField } from "./shared";

export function AddDownloadDialog({
  defaultDirectory,
  recentDirectories,
  onClose,
  onSelectDirectory,
  onSelectTaskFile,
  onSubmit,
}: {
  defaultDirectory: string;
  recentDirectories: string[];
  onClose: () => void;
  onSelectDirectory: ReturnType<
    typeof useDownloads
  >["actions"]["selectDirectory"];
  onSelectTaskFile: ReturnType<
    typeof useDownloads
  >["actions"]["selectTaskFile"];
  onSubmit: (
    source: string,
    directory: string,
    fileName: string,
  ) => Promise<void>;
}) {
  const [source, setSource] = useState("");
  const [directory, setDirectory] = useState(defaultDirectory);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!source.trim()) {
      const message = "请粘贴下载链接或选择任务文件。";
      setSourceError(message);
      setError(message);
      return;
    }

    if (fileName.trim() && !/^https?:\/\//iu.test(source.trim())) {
      const message = "自定义文件名仅适用于 HTTP/HTTPS 单文件下载。";
      setError(message);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSourceError(null);

    try {
      await onSubmit(source.trim(), directory, fileName.trim());
    } catch (caught) {
      setError(normalizeUserError(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal closeDisabled={isSubmitting} onClose={onClose} title="新建下载任务">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <SourceField
          error={sourceError}
          onChange={(nextSource) => {
            setSource(nextSource);
            setSourceError(null);
            setError(null);
          }}
          onError={setError}
          onSelectFile={onSelectTaskFile}
          value={source}
        />
        <label className="grid gap-2" htmlFor="download-file-name">
          <span className="text-sm font-medium">保存文件名（可选）</span>
          <Input
            id="download-file-name"
            onChange={(event) => {
              setFileName(event.target.value);
              setError(null);
            }}
            placeholder="例如：安装包.exe"
            value={fileName}
          />
          <span className="text-xs leading-5 text-muted-foreground">
            适用于 HTTP/HTTPS 单文件下载；留空时使用服务器提供的文件名。
          </span>
        </label>
        <DirectoryField
          label="保存目录"
          onBrowse={onSelectDirectory}
          onChange={setDirectory}
          onError={(message) => setError(message)}
          recentDirectories={recentDirectories}
          value={directory}
        />
        {error ? (
          <Alert variant="destructive">
            <AlertDescription id="download-source-error">
              {error}
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="outline">
            取消
          </Button>
          <Button disabled={isSubmitting} type="submit">
            <Plus aria-hidden="true" size={14} />
            {isSubmitting ? "正在创建…" : "开始下载"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
