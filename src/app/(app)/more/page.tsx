import Link from 'next/link';
import { MessageCircle, Target, Upload, Settings, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';

const menuItems = [
  { href: '/chat', icon: MessageCircle, label: 'Chat IA', description: 'Pergunte sobre suas finanças', color: 'text-blue-600 bg-blue-500/10' },
  { href: '/more/orcamentos', icon: Wallet, label: 'Orçamentos', description: 'Limite de gastos por categoria', color: 'text-green-600 bg-green-500/10' },
  { href: '/more/objetivos', icon: Target, label: 'Objetivos', description: 'Metas financeiras', color: 'text-purple-600 bg-purple-500/10' },
  { href: '/import', icon: Upload, label: 'Importar Extrato', description: 'OFX e CSV do seu banco', color: 'text-amber-600 bg-amber-500/10' },
  { href: '/settings', icon: Settings, label: 'Configurações', description: 'Perfil, plano e dados', color: 'text-muted-foreground bg-muted' },
];

export default function MorePage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">Mais</h1>
      <div className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="flex items-center gap-3 p-4 active:bg-muted transition-colors">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.color}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
