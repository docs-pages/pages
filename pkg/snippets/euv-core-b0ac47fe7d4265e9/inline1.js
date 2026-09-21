
export function euv_collect_subtree_ids(root) {
    const out = [];
    const stack = [root];
    while (stack.length > 0) {
        const node = stack.pop();
        if (!node || node.nodeType !== 1) {
            continue;
        }
        const euv = node.getAttribute("data-euv-id");
        const dynamicId = node.getAttribute("data-euv-dynamic-id");
        const euvParsed = euv === null ? NaN : parseInt(euv, 10);
        const dynamicParsed = dynamicId === null ? NaN : parseInt(dynamicId, 10);
        out.push(isNaN(euvParsed) ? NaN : euvParsed);
        out.push(isNaN(dynamicParsed) ? NaN : dynamicParsed);
        const children = node.children;
        for (let i = children.length - 1; i >= 0; i--) {
            stack.push(children[i]);
        }
    }
    return Float64Array.from(out);
}
