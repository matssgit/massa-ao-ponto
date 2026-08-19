# 🍕 Massa ao Ponto

> Sistema de gestão e operação para uma pizzaria, desenvolvido como projeto de portfólio com foco em arquitetura, backend, regras de negócio e integração de sistemas.

🚧 **Status: Em desenvolvimento**

O Massa ao Ponto está sendo desenvolvido de forma incremental, utilizando feature slices para evoluir o sistema com regras de negócio bem definidas, testes automatizados e integração real com PostgreSQL.

---

## 🚀 Status do projeto

| Módulo                   | Status                   |
| ------------------------ | ------------------------ |
| Infraestrutura           | ✅ Concluído             |
| Restaurantes             | ✅ Concluído             |
| Mesas                    | ✅ Criação e listagem    |
| Reservas                 | ✅ Milestone 1 concluído |
| Disponibilidade          | ✅ Concluído             |
| Delivery                 | ⏳ Planejado             |
| Pagamentos               | ⏳ Planejado             |
| Automações               | ⏳ Planejado             |
| Dashboard administrativo | ⏳ Planejado             |

### Milestone 1 — Reservas

A primeira grande etapa do sistema está concluída, cobrindo o ciclo principal de reservas:

- criação de reservas;
- validação de capacidade;
- validação de mesa e restaurante;
- prevenção de conflitos de horário;
- controle de concorrência;
- atualização de status;
- cancelamento;
- listagem com filtros;
- consulta individual;
- consulta de disponibilidade;
- histórico de alterações.

**120 testes automatizados passando em 19 arquivos de teste.**
