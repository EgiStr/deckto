// Shared JSON envelope: { ok, command, version, data, error }
export function okEnvelope(command, version, data) {
  return { ok: true, command, version, data, error: null };
}

export function failEnvelope(command, version, error) {
  return { ok: false, command, version, data: null, error: String(error) };
}

export function emit(env, { json }, text) {
  if (json) {
    process.stdout.write(JSON.stringify(env) + '\n');
  } else if (text !== undefined) {
    process.stdout.write(text + '\n');
  }
  return env.ok ? 0 : 1;
}
