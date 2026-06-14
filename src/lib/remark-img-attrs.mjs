/**
 * remark-img-attrs — ajoute loading="lazy" + decoding="async" à tous les <img>
 * générés depuis ![]() en markdown body, pour Core Web Vitals (CLS) et
 * performance (lazy loading natif).
 *
 * Pas de width/height auto (impossible sans inspecter chaque image distante).
 * Compte sur l'aspect-ratio CSS du parent ou la classe .prose-article img
 * pour limiter le CLS.
 */
export default function remarkImgAttrs() {
  return (tree) => {
    function visit(node) {
      if (!node) return;
      if (node.type === 'image') {
        node.data = node.data ?? {};
        node.data.hProperties = node.data.hProperties ?? {};
        node.data.hProperties.loading = node.data.hProperties.loading ?? 'lazy';
        node.data.hProperties.decoding = node.data.hProperties.decoding ?? 'async';
      }
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) visit(child);
      }
    }
    visit(tree);
  };
}
