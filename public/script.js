const CLIENT_ID = "812677915854-92qd2opvc3b1kcph8pn3hp43650ldo3r.apps.googleusercontent.com";
const form = document.getElementById("formulario");
const campoNumero = document.getElementById("numero");
const mensagem = document.getElementById("mensagem");
const figura = document.getElementById("desenho");
const botaoBaixar = document.getElementById("baixar");
const usuario = document.getElementById("usuario");

let idToken = null;
let svgAtual = null;

function mostrarErro(texto) {
  mensagem.textContent = texto;
}

function onLogin(resposta) {
  idToken = resposta.credential;
  mostrarErro("");
  usuario.textContent = "Login realizado com sucesso.";
}

function iniciarGoogle() {
  if (!window.google || !google.accounts) {
    setTimeout(iniciarGoogle, 100);
    return;
  }
  google.accounts.id.initialize({ client_id: CLIENT_ID, callback: onLogin });
  google.accounts.id.renderButton(document.getElementById("login-google"), {
    theme: "outline",
    size: "large",
  });
}
iniciarGoogle();

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mostrarErro("");
  figura.innerHTML = "";
  botaoBaixar.hidden = true;

  if (!idToken) {
    mostrarErro("Faça login com o Google antes de gerar o desenho.");
    return;
  }

  const numero = Number(campoNumero.value);

  try {
    const resposta = await fetch("/api/desenho", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + idToken,
      },
      body: JSON.stringify({ numero }),
    });

    if (resposta.status === 400) {
      mostrarErro("Erro 400: número inválido. Informe um inteiro entre 1 e 100.");
      return;
    }
    if (resposta.status === 401) {
      idToken = null;
      mostrarErro("Erro 401: não autorizado. Faça login com o Google novamente.");
      return;
    }
    if (!resposta.ok) {
      mostrarErro("Erro inesperado (" + resposta.status + ").");
      return;
    }

    svgAtual = await resposta.text();
    figura.innerHTML = svgAtual;
    botaoBaixar.hidden = false;
  } catch {
    mostrarErro("Falha de rede ao chamar o servidor.");
  }
});

botaoBaixar.addEventListener("click", () => {
  if (!svgAtual) return;
  const blob = new Blob([svgAtual], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "exemplo.svg";
  a.click();
  URL.revokeObjectURL(url);
});