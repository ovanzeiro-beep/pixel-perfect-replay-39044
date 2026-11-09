import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BotaoGrande, Campo, campoClasse } from "@/components/app/Formulario";
import { salvarPerfil, useVanzeiro } from "@/data/repositorio";
import { ESTADOS_BR, validarPerfil } from "@/lib/validacao";

/** Editar os dados do próprio vanzeiro (nome, celular, cidade e estado). */
export function DadosDoVanzeiro() {
  const perfil = useVanzeiro();
  const [f, setF] = useState({
    nome: perfil.nome,
    telefone: perfil.telefone,
    cidade: perfil.cidade,
    estado: perfil.estado,
  });
  const [erros, setErros] = useState<ReturnType<typeof validarPerfil>>({});
  useEffect(
    () =>
      setF({
        nome: perfil.nome,
        telefone: perfil.telefone,
        cidade: perfil.cidade,
        estado: perfil.estado,
      }),
    [perfil.nome, perfil.telefone, perfil.cidade, perfil.estado],
  );
  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const er = validarPerfil(f);
    setErros(er);
    if (Object.keys(er).length) return;
    salvarPerfil({ ...f, email: perfil.email });
    toast.success("Seus dados foram salvos");
  };

  return (
    <form
      onSubmit={salvar}
      noValidate
      aria-label="Seus dados"
      className="mt-6 space-y-3 rounded-3xl bg-card p-5 shadow-sm"
    >
      <h2 className="text-lg font-extrabold text-primary">Seus dados</h2>
      <Campo label="Nome" obrigatorio erro={erros.nome}>
        <input className={campoClasse} autoComplete="name" value={f.nome} onChange={muda("nome")} />
      </Campo>
      <Campo label="Celular (com DDD)" obrigatorio erro={erros.telefone}>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className={campoClasse}
          value={f.telefone}
          onChange={muda("telefone")}
        />
      </Campo>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Campo label="Cidade" obrigatorio erro={erros.cidade}>
            <input className={campoClasse} value={f.cidade} onChange={muda("cidade")} />
          </Campo>
        </div>
        <Campo label="Estado" obrigatorio erro={erros.estado}>
          <select className={campoClasse} value={f.estado} onChange={muda("estado")}>
            <option value="">—</option>
            {ESTADOS_BR.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <p className="text-sm text-muted-foreground">
        Seu nome e celular aparecem para os passageiros (convite, avisos e recibos).
      </p>
      <BotaoGrande type="submit">Salvar meus dados</BotaoGrande>
    </form>
  );
}
