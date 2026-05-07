# Company Brain Artifact Field Canonical

Atualizado em 2026-05-07 BRT.

## Campo canonico

O campo canonico do runtime/API para artifacts e `artifactType`.

Usar:

```json
{
  "artifactType": "github_pr_ci"
}
```

Nao usar `type` como campo top-level de `Artifact`.

## Onde `type` pode aparecer

`type` pode aparecer apenas dentro de payload bruto externo ou metadata normalizada quando a fonte original usa esse nome. Exemplos:

- `metadata.subjectType` para GitHub notifications;
- payload bruto guardado em `metadata.raw` ou equivalente;
- entrada externa antes do adapter normalizar.

## Regra para adapters/importers

Adapters e importers devem normalizar qualquer `type` externo para `artifactType` antes de criar `Artifact`.

Se o valor original for relevante para auditoria, guardar em `metadata.originalType` ou campo especifico de adapter, mantendo `artifactType` como superficie canonica de busca, UI e API.
