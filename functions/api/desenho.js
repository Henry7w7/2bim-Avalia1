import { gerarDesenho } from "../../lib/desenho.js";

function erro(status, mensagem) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  // 1) Método -> 405
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ erro: "Método não permitido." }), {
      status: 405,
      headers: { "Content-Type": "application/json; charset=utf-8", Allow: "POST" },
    });
  }

  // 2) Corpo -> 400
  let corpo;
  try {
    const texto = await request.text();
    if (!texto.trim()) return erro(400, "Corpo ausente.");
    corpo = JSON.parse(texto);
  } catch {
    return erro(400, "JSON inválido.");
  }
  const numero = corpo && typeof corpo === "object" ? corpo.numero : undefined;
  if (numero === undefined || numero === null) return erro(400, "Campo numero ausente.");
  if (typeof numero !== "number" || !Number.isInteger(numero)) {
    return erro(400, "numero deve ser um inteiro.");
  }
  if (numero < 1 || numero > 100) return erro(400, "numero deve estar entre 1 e 100.");

  // 3) Token -> 401
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return erro(401, "Token ausente.");
  const token = m[1].trim();

  let info;
  try {
    const resp = await fetch(
      "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(token)
    );
    if (resp.status !== 200) return erro(401, "Token inválido ou expirado.");
    info = await resp.json();
  } catch {
    return erro(401, "Não foi possível verificar o token.");
  }

  if (!env.GOOGLE_CLIENT_ID || info.aud !== env.GOOGLE_CLIENT_ID) {
    return erro(401, "Token emitido para outro cliente.");
  }
  if (String(info.email_verified) !== "true" || !info.email) {
    return erro(401, "E-mail não verificado.");
  }

  // 200: assinado com o e-mail que veio do Google
  const svg = gerarDesenho(numero, info.email);
  return new Response(svg, {
    status: 200,
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
  });
}