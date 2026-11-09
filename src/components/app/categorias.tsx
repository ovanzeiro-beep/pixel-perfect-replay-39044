import {
  CircleDot,
  Droplets,
  Ellipsis,
  FileText,
  Fuel,
  Milestone,
  UserRound,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Categoria } from "@/data/financeiro";

export const ICONE_CATEGORIA: Record<Categoria, LucideIcon> = {
  Diesel: Fuel,
  Manutenção: Wrench,
  Pneus: CircleDot,
  Pedágio: Milestone,
  Alimentação: Utensils,
  "Pagamento de motorista": UserRound,
  "Documentos e seguro": FileText,
  Lavagem: Droplets,
  Outros: Ellipsis,
};
