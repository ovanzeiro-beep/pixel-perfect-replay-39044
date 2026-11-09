import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TamanhoDaLetra } from "@/components/app/TamanhoDaLetra";
import { useState } from "react";
import { Check, Edit3, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { encerrarSessao, usePassageiroId } from "@/data/sessao";
import { useFrota, atualizarPassageiro, useVanzeiro } from "@/data/repositorio";
import { linkWhatsApp } from "@/lib/validacao";

function MeuPerfil() {
  const vanzeiro = useVanzeiro();
  const { passageiros } = useFrota();
  const passageiroId = usePassageiroId();
  const navigate = useNavigate();
  const p = passageiros.find((x) => x.id === passageiroId);

  const [editEmergencia, setEditEmergencia] = useState(false);
  const [emergNome, setEmergNome] = useState("");
  const [emergTel, setEmergTel] = useState("");

  if (!p) return null;

  const abrirEditEmergencia = () => {
    setEmergNome(p.emergenciaNome);
    setEmergTel(p.emergenciaTelefone);
    setEditEmergencia(true);
  };

  const salvarEmergencia = () => {
    atualizarPassageiro(p.id, { emergenciaNome: emergNome, emergenciaTelefone: emergTel });
    setEditEmergencia(false);
    toast.success("Contato de emergência salvo.");
  };

  const pedirMudancaEndereco = () => {
    const msg = `Olá, ${vanzeiro.nome}! Preciso atualizar meu endereço. Novo endereço: `;
    const url = `${linkWhatsApp(vanzeiro.telefone)}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const sair = () => {
    encerrarSessao();
    void navigate({ to: "/", replace: true });
  };

  return (
    <div className="px-5 pb-6 pt-6 space-y-5">
      <Toaster position="top-center" />
      <h1 className="text-3xl font-extrabold text-primary">Meu perfil</h1>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Seus dados
        </h2>
        <div className="rounded-3xl bg-card p-5 shadow-sm space-y-4">
          <Campo label="Nome" valor={p.nome} />
          <Campo label="Telefone" valor={p.telefone} />
          <Campo
            label="Endereço"
            valor={`${p.endereco}${p.bairro ? `, ${p.bairro}` : ""} — ${p.cidade}`}
          />
          {p.referencia && <Campo label="Referência" valor={p.referencia} />}
          <button
            onClick={pedirMudancaEndereco}
            className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-primary text-sm font-bold text-primary"
          >
            <MessageCircle className="h-4 w-4" /> Pedir mudança de endereço
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Contato de emergência
        </h2>
        <div className="rounded-3xl bg-card p-5 shadow-sm space-y-3">
          {editEmergencia ? (
            <>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Nome</label>
                  <input
                    value={emergNome}
                    onChange={(e) => setEmergNome(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
                    placeholder="Ex: Maria (mãe)"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Telefone</label>
                  <input
                    value={emergTel}
                    onChange={(e) => setEmergTel(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
                    placeholder="(43) 9xxxx-xxxx"
                    type="tel"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditEmergencia(false)}
                  className="flex-1 min-h-11 rounded-xl border-2 border-muted text-sm font-bold text-muted-foreground"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarEmergencia}
                  className="flex-1 min-h-11 flex items-center justify-center gap-1 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
                >
                  <Check className="h-4 w-4" /> Salvar
                </button>
              </div>
            </>
          ) : (
            <>
              {p.emergenciaNome ? (
                <>
                  <Campo label="Nome" valor={p.emergenciaNome} />
                  {p.emergenciaTelefone && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Campo label="Telefone" valor={p.emergenciaTelefone} />
                      </div>
                      <a
                        href={`tel:${p.emergenciaTelefone.replace(/\D/g, "")}`}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-primary text-primary"
                        aria-label="Ligar"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
              )}
              <button
                onClick={abrirEditEmergencia}
                className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-primary/10 text-sm font-bold text-primary"
              >
                <Edit3 className="h-4 w-4" />
                {p.emergenciaNome ? "Editar contato" : "Adicionar contato"}
              </button>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Seu vanzeiro
        </h2>
        <div className="rounded-3xl bg-card p-5 shadow-sm">
          <p className="font-bold">{vanzeiro.nome}</p>
          <p className="text-sm text-muted-foreground">
            {vanzeiro.cidade} — {vanzeiro.estado}
          </p>
        </div>
      </section>

      <TamanhoDaLetra />

      <section>
        <button
          onClick={sair}
          className="flex w-full min-h-14 items-center justify-center rounded-3xl border-2 border-destructive font-bold text-destructive"
        >
          Sair
        </button>
      </section>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-bold">{valor || "—"}</p>
    </div>
  );
}

export const Route = createFileRoute("/passageiro/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil · O Vanzeiro" },
      { name: "description", content: "Seu perfil de passageiro no O Vanzeiro." },
      { property: "og:title", content: "Meu perfil · O Vanzeiro" },
      { property: "og:description", content: "Meu perfil de passageiro no O Vanzeiro." },
    ],
  }),
  component: MeuPerfil,
});
