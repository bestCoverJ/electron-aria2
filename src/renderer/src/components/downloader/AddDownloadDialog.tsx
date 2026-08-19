import type {
  AddDownloadBatchItemResult,
  AddDownloadBatchResult,
} from "@shared/types";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDownloads } from "@/hooks/use-downloads";
import { normalizeUserError } from "@/lib/tide-api";
import { DirectoryField, Modal, SourceField } from "./shared";

interface AddDialogSubmission {
  sources: string[];
  directory: string;
  fileName: string;
}

export function AddDownloadDialog({
  defaultDirectory,
  recentDirectories,
  onClose,
  onSelectDirectory,
  onSelectTaskFiles,
  onSubmit,
}: {
  defaultDirectory: string;
  recentDirectories: string[];
  onClose: () => void;
  onSelectDirectory: ReturnType<
    typeof useDownloads
  >["actions"]["selectDirectory"];
  onSelectTaskFiles: ReturnType<
    typeof useDownloads
  >["actions"]["selectTaskFiles"];
  onSubmit: (input: AddDialogSubmission) => Promise<AddDownloadBatchResult>;
}) {
  const [source, setSource] = useState("");
  const [directory, setDirectory] = useState(defaultDirectory);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [failedItems, setFailedItems] = useState<AddDownloadBatchItemResult[]>(
    [],
  );
  const [summary, setSummary] = useState<AddDownloadBatchResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sources = useMemo(() => splitSources(source), [source]);
  const canRename = sources.length === 1 && isRenameEligible(sources[0]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (sources.length === 0) {
      const message = "请粘贴至少一条下载链接或选择任务文件。";
      setSourceError(message);
      setError(message);
      return;
    }

    if (sources.length > 100) {
      const message = "单次最多添加 100 条下载来源。";
      setSourceError(message);
      setError(message);
      return;
    }

    if (fileName.trim() && !canRename) {
      setError("自定义文件名仅适用于单条普通 HTTP/HTTPS/FTP/SFTP 文件链接。");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSourceError(null);
    setFailedItems([]);
    setSummary(null);

    try {
      const result = await onSubmit({
        sources,
        directory,
        fileName: canRename ? fileName.trim() : "",
      });
      const nextFailedItems = result.items.filter(
        (item) => item.status === "failed",
      );
      setSummary(result);
      setFailedItems(nextFailedItems);

      if (nextFailedItems.length === 0) {
        onClose();
        return;
      }

      setSource(nextFailedItems.map((item) => item.source).join("\n"));
      setFileName("");
    } catch (caught) {
      setError(normalizeUserError(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      blurBackdrop={false}
      closeDisabled={isSubmitting}
      onClose={onClose}
      panelClassName="p-4 [&>div:first-child]:mb-3"
      title="新建下载任务"
    >
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <SourceField
          error={sourceError}
          onChange={(nextSource) => {
            setSource(nextSource);
            setSourceError(null);
            setError(null);
            setFailedItems([]);
            setSummary(null);
          }}
          onError={setError}
          onSelectFiles={onSelectTaskFiles}
          sourceCount={sources.length}
          value={source}
        />

        <label className="grid gap-1.5" htmlFor="download-file-name">
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">保存文件名</span>
            <span className="text-xs font-normal text-muted-foreground">
              {canRename ? "可选" : "仅单条直链可用"}
            </span>
          </span>
          <Input
            disabled={!canRename || isSubmitting}
            id="download-file-name"
            onChange={(event) => {
              setFileName(event.target.value);
              setError(null);
            }}
            placeholder="例如：安装包.exe"
            title={
              !canRename ? "批量或任务文件将自动使用原始文件名" : undefined
            }
            value={fileName}
          />
        </label>

        <DirectoryField
          label="保存目录"
          onBrowse={onSelectDirectory}
          onChange={setDirectory}
          onError={(message) => setError(message)}
          recentDirectories={recentDirectories}
          value={directory}
        />

        {summary ? <BatchSummary result={summary} /> : null}
        {failedItems.length > 0 ? (
          <div className="max-h-32 overflow-auto rounded-md border">
            {failedItems.map((item, index) => (
              <div
                className="border-b px-3 py-2 text-xs last:border-b-0"
                key={`${item.source}-${index}`}
              >
                <p className="truncate font-medium" title={item.source}>
                  {item.source}
                </p>
                <p className="mt-1 text-destructive">
                  {item.error ?? "创建失败，请重试。"}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription id="download-source-error">
              {error}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
            variant="outline"
          >
            取消
          </Button>
          <Button disabled={isSubmitting || sources.length === 0} type="submit">
            <Plus aria-hidden="true" size={14} />
            {isSubmitting
              ? "正在创建…"
              : sources.length > 1
                ? `开始下载（${sources.length}）`
                : "开始下载"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function BatchSummary({ result }: { result: AddDownloadBatchResult }) {
  const hasFailure = result.failedCount > 0;

  return (
    <Alert variant={hasFailure ? "destructive" : "default"}>
      {hasFailure ? (
        <AlertCircle
          aria-hidden="true"
          className="absolute left-3 top-3"
          size={16}
        />
      ) : (
        <CheckCircle2
          aria-hidden="true"
          className="absolute left-3 top-3"
          size={16}
        />
      )}
      <AlertDescription className="pl-6">
        已创建 {result.createdCount} 条，跳过 {result.skippedCount} 条，失败{" "}
        {result.failedCount} 条。
        {hasFailure ? " 成功项已从输入框移除，请修正下方失败项后重试。" : ""}
      </AlertDescription>
    </Alert>
  );
}

function splitSources(value: string): string[] {
  return value
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isRenameEligible(source: string | undefined): boolean {
  if (!source || !/^(?:https?|s?ftp):\/\//iu.test(source)) {
    return false;
  }

  try {
    const extension = new URL(source).pathname.toLowerCase();
    return !/\.(?:torrent|metalink|meta4)$/u.test(extension);
  } catch {
    return false;
  }
}
