// Temporary debug page to check environment variables in production
// DELETE THIS FILE AFTER DEBUGGING

export default function DebugEnv() {
  const envVars = {
    ENV_PROFILE: process.env.ENV_PROFILE,
    NODE_ENV: process.env.NODE_ENV,
    PROD_BACKEND_INTERNAL_URL: process.env.PROD_BACKEND_INTERNAL_URL,
    PROD_NEXT_PUBLIC_BACKEND_URL: process.env.PROD_NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    ALL_PROD_VARS: Object.keys(process.env).filter(k => k.startsWith('PROD_')),
    ALL_NEXT_PUBLIC_VARS: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')),
    ALL_ENV_VARS_COUNT: Object.keys(process.env).length
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Variables Debug</h1>
      <pre style={{ background: '#f0f0f0', padding: '10px' }}>
        {JSON.stringify(envVars, null, 2)}
      </pre>
      <p><strong>Server-side rendering:</strong> {typeof window === 'undefined' ? 'YES' : 'NO'}</p>
    </div>
  );
}