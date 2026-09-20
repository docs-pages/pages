
export function euv_event_collect_id_chain(event, max_depth) {
    const ids = [];
    let node = event.target;
    let depth = 0;
    // Unbounded when max_depth is 0 (per the call site convention in
    // dispatch_delegated_event — passing 0 means "walk until <html>").
    // Otherwise count `event.target` itself as depth 1.
    while (node) {
        if (max_depth !== 0 && depth >= max_depth) {
            break;
        }
        // Only DOM Elements carry data-euv-id; skip text nodes cheaply.
        if (node.nodeType === 1) {
            const id = node.getAttribute && node.getAttribute("data-euv-id");
            if (id !== null && id !== undefined && id !== "") {
                // parseInt is native (no string alloc on the WASM side);
                // NaN check guards against malformed attribute values.
                const parsed = parseInt(id, 10);
                if (!isNaN(parsed)) {
                    ids.push(parsed);
                }
            }
        }
        node = node.parentElement;
        depth += 1;
    }
    return Float64Array.from(ids);
}
