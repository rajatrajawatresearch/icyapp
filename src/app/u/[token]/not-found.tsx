export default function InvalidLink() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="text-4xl">🔒</div>
      <h1 className="mt-4 text-xl font-semibold text-gray-900">
        This link is invalid
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        It may have expired or been replaced. Please ask the store to send you
        your latest link.
      </p>
    </main>
  );
}
