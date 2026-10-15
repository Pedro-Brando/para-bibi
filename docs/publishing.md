# Publicação

O site é servido pelo GitHub Pages a partir do branch `gh-pages`, que contém só o build (`dist/`).
O token do `gh` desta máquina não tem o escopo `workflow`, por isso não há GitHub Actions: a publicação é manual.

Para publicar uma nova versão:

```bash
npm test && npm run build
D="$(mktemp -d)" && cp -r dist/. "$D" && touch "$D/.nojekyll"
cd "$D" && git init -q -b gh-pages && git add -A && git commit -q -m "Publish site build"
git push -f https://github.com/Pedro-Brando/para-bibi.git gh-pages
```

Endereço: https://pedro-brando.github.io/para-bibi/
