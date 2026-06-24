export function ArgsView({ args }: { args: Record<string, unknown> }) {
  return (
    <pre className="bg-muted text-muted-foreground overflow-x-auto rounded-md p-3 text-xs">
      {JSON.stringify(args, null, 2)}
    </pre>
  );
}
