import BragExplorer from '@/components/BragExplorer';

const name = process.env.NEXT_PUBLIC_OWNER_NAME ?? 'My';

export default function Home() {
  return (
    <main className="min-h-screen py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold text-stone-900 mb-1">
            {name}&apos;s Work History Explorer
          </h1>
          <p className="text-stone-500 text-sm">
            Ask anything about {name}&apos;s experience — Claude will find the most relevant examples.
          </p>
        </header>
        <BragExplorer />
      </div>
    </main>
  );
}
