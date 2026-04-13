import { supabase, clearSession } from './supabase.js';
import { output, error } from './output.js';
import type { Profile } from './types.js';

export async function requireAuth(): Promise<{ userId: string }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    error('Not logged in. Run: artemys login --email <email>');
    process.exit(1);
  }
  return { userId: user.id };
}

export async function login(email: string, password?: string): Promise<void> {
  // Password login if provided
  if (password) {
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      error(`Login failed: ${authError.message}`);
      process.exit(1);
    }

    const userId = data.user.id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    output(
      { id: userId, email, name: profile?.name, handle: profile?.handle },
      `Logged in as ${profile?.name ?? email} (@${profile?.handle ?? 'unknown'})`,
    );
    return;
  }

  // Magic link / OTP login
  const { error: otpError } = await supabase.auth.signInWithOtp({ email });

  if (otpError) {
    error(`Failed to send login code: ${otpError.message}`);
    process.exit(1);
  }

  output(
    { email, status: 'otp_sent' },
    `Login code sent to ${email}. Run: artemys verify --email ${email} --token <code>`,
  );
}

export async function verify(opts: {
  email?: string;
  token?: string;
  link?: string;
}): Promise<void> {
  let data;
  let verifyError;

  if (opts.link) {
    // Extract token_hash from magic link URL
    const url = new URL(opts.link);
    const tokenHash = url.searchParams.get('token');
    if (!tokenHash) {
      error('Could not extract token from link. Paste the full URL from the email.');
      process.exit(1);
    }

    ({ data, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    }));
  } else if (opts.email && opts.token) {
    // 6-digit OTP code
    ({ data, error: verifyError } = await supabase.auth.verifyOtp({
      email: opts.email,
      token: opts.token,
      type: 'email',
    }));
  } else {
    error('Provide either --link <url> or both --email and --token.');
    process.exit(1);
  }

  if (verifyError) {
    error(`Verification failed: ${verifyError.message}`);
    process.exit(1);
  }

  const userId = data.user!.id;
  const email = data.user!.email ?? opts.email ?? '';
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  output(
    { id: userId, email, name: profile?.name, handle: profile?.handle },
    `Logged in as ${profile?.name ?? email} (@${profile?.handle ?? 'unknown'})`,
  );
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
  clearSession();
  output({ success: true }, 'Logged out.');
}

export async function whoami(): Promise<void> {
  const { userId } = await requireAuth();

  const [profileResult, countResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  if (profileResult.error || !profileResult.data) {
    error('Could not fetch profile.');
    process.exit(1);
  }

  const p = profileResult.data as Profile;
  const count = countResult.count;

  output(
    { ...p, project_count: count ?? 0 },
    [
      `${p.name} (@${p.handle})`,
      p.bio ? `  ${p.bio}` : null,
      `  ${count ?? 0} projects`,
    ]
      .filter(Boolean)
      .join('\n'),
  );
}
