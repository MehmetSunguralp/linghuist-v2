type ProfilePageProps = {
  readonly params: Promise<{ id: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;

  return (
    <main className="min-h-dvh bg-[#0b1229] px-6 py-10 text-[#dce1ff]">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-[#181e36] p-6">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-3 text-sm text-[#9caec8]">
          Profile page placeholder for user <span className="font-semibold text-[#dce1ff]">{id}</span>.
        </p>
      </div>
    </main>
  );
}
