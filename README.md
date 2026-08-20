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
| Clientes                 | ✅ Consulta e histórico  |
| Reservas                 | ✅ Milestone 1 concluído |
| Disponibilidade          | ✅ Concluído             |
| Delivery                 | ⏳ Planejado             |
| Pagamentos               | ⏳ Planejado             |
| Automações               | ⏳ Planejado             |
| Dashboard administrativo | ⏳ Planejado             |

### Milestone 1 — Reservas e Clientes

A primeira grande etapa do sistema está concluída, cobrindo o ciclo principal de reservas e a leitura de clientes:

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
- histórico de alterações;
- consulta individual de clientes;
- histórico de reservas do cliente.

**133 testes automatizados passando em 22 arquivos de teste.**
