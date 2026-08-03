"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { cmsApiUrl } from "./CmsProvider";

type CommentRecord = {
  authorName: string;
  body: string;
  createdAt: number;
  exhibitNo: string;
  id: string;
  parentId: string | null;
};

type CommentNode = CommentRecord & { replies: CommentNode[] };

function threadComments(comments: CommentRecord[]): CommentNode[] {
  const nodes = new Map(comments.map((comment) => [comment.id, { ...comment, replies: [] as CommentNode[] }]));
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    const node = nodes.get(comment.id);
    if (!node) continue;
    const parent = comment.parentId ? nodes.get(comment.parentId) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }

  return roots;
}

function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp * 1000));
}

function CommentForm({ exhibitNo, parentId, replyingTo, onCancel, onPosted }: {
  exhibitNo: string;
  parentId: string | null;
  replyingTo?: string;
  onCancel?: () => void;
  onPosted: () => Promise<void>;
}) {
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice("Posting…");

    try {
      const response = await fetch(cmsApiUrl("/api/cms/comments"), {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName, body, exhibitNo, parentId, website }),
      });
      const payload = await response.json().catch(() => ({ error: "The comment service returned an unreadable response." }));
      if (!response.ok) throw new Error(payload.error || "The comment could not be posted.");
      setBody("");
      setNotice("Posted.");
      await onPosted();
      if (parentId && onCancel) onCancel();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The comment could not be posted.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={`comment-form${parentId ? " comment-reply-form" : ""}`} onSubmit={submit}>
      {replyingTo ? <p className="comment-form-heading">Replying to {replyingTo}</p> : <p className="comment-form-heading">Join the discussion</p>}
      <label>
        Display name
        <input autoComplete="name" maxLength={60} minLength={2} onChange={(event) => setAuthorName(event.target.value)} required value={authorName} />
      </label>
      <label>
        Comment
        <textarea maxLength={2000} minLength={3} onChange={(event) => setBody(event.target.value)} required rows={parentId ? 3 : 4} value={body} />
      </label>
      <label className="comment-honeypot" aria-hidden="true">
        Website
        <input autoComplete="off" onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} value={website} />
      </label>
      <div className="comment-form-actions">
        <button className="button button-primary" disabled={submitting} type="submit">{parentId ? "Post reply" : "Post comment"}</button>
        {onCancel ? <button className="comment-cancel" disabled={submitting} onClick={onCancel} type="button">Cancel</button> : null}
        <span aria-live="polite">{notice}</span>
      </div>
    </form>
  );
}

function CommentItem({ comment, onReply, replyingTo, onPosted }: {
  comment: CommentNode;
  onReply: (comment: CommentRecord) => void;
  replyingTo: string | null;
  onPosted: () => Promise<void>;
}) {
  return (
    <li className="comment-item">
      <article>
        <header>
          <b>{comment.authorName}</b>
          <time dateTime={new Date(comment.createdAt * 1000).toISOString()}>{formatTimestamp(comment.createdAt)}</time>
        </header>
        <p>{comment.body}</p>
        <button className="comment-reply-button" onClick={() => onReply(comment)} type="button">Reply</button>
      </article>
      {replyingTo === comment.id ? (
        <CommentForm exhibitNo={comment.exhibitNo} onCancel={() => onReply(comment)} onPosted={onPosted} parentId={comment.id} replyingTo={comment.authorName} />
      ) : null}
      {comment.replies.length ? (
        <ol className="comment-replies">
          {comment.replies.map((reply) => <CommentItem comment={reply} key={reply.id} onPosted={onPosted} onReply={onReply} replyingTo={replyingTo} />)}
        </ol>
      ) : null}
    </li>
  );
}

export function ExhibitComments({ exhibitNo, exhibitTitle }: { exhibitNo: string; exhibitTitle: string }) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = new URL(cmsApiUrl("/api/cms/comments"), window.location.href);
      endpoint.searchParams.set("exhibit", exhibitNo);
      const response = await fetch(endpoint, { credentials: "omit", cache: "no-store" });
      const payload = await response.json().catch(() => ({ error: "The discussion service returned an unreadable response." }));
      if (!response.ok) throw new Error(payload.error || "Comments could not be loaded.");
      setComments(Array.isArray(payload.comments) ? payload.comments : []);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Comments could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [exhibitNo]);

  useEffect(() => {
    if (!expanded) return;
    const refresh = window.setInterval(loadComments, 30_000);
    return () => window.clearInterval(refresh);
  }, [expanded, loadComments]);

  const threads = useMemo(() => threadComments(comments), [comments]);
  const commentCount = comments.length;

  function toggleReply(comment: CommentRecord) {
    setReplyingTo((current) => current === comment.id ? null : comment.id);
  }

  function toggleDiscussion() {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    if (nextExpanded) void loadComments();
  }

  return (
    <section className="exhibit-discussion" aria-label={`Discussion for Exhibit #${exhibitNo}: ${exhibitTitle}`}>
      <button aria-expanded={expanded} className="discussion-toggle" onClick={toggleDiscussion} type="button">
        <span><b>Discussion</b><small>Read comments or reply to another visitor.</small></span>
        <span>{commentCount ? `${commentCount} ${commentCount === 1 ? "comment" : "comments"}` : expanded && !loading ? "No comments yet" : "Open discussion"}<i aria-hidden="true">+</i></span>
      </button>
      {expanded ? (
        <div className="discussion-panel">
          <p className="discussion-safety"><b>Keep the discussion evidence-focused.</b> Do not identify children, share sealed records, post private information, or harass anyone. Comments may be moderated.</p>
          <CommentForm exhibitNo={exhibitNo} onPosted={loadComments} parentId={null} />
          {error ? <p className="comment-error" role="alert">{error}</p> : null}
          {loading && !comments.length ? <p className="comment-loading" role="status">Loading discussion…</p> : null}
          {!loading && !comments.length && !error ? <p className="comment-empty">No comments yet. You can start the discussion.</p> : null}
          {threads.length ? (
            <ol className="comment-list">
              {threads.map((comment) => <CommentItem comment={comment} key={comment.id} onPosted={loadComments} onReply={toggleReply} replyingTo={replyingTo} />)}
            </ol>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
