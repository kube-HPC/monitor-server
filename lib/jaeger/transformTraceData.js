
const _isEqual = require('lodash.isequal');
const TreeNode = require('./TreeNode')
//const { getTraceSpanIdsAsTree } = require('../selectors/trace');

const TREE_ROOT_ID = '__root__';
const transformTraceData = (data) => {
    if (!data || !data.traceID) {
        return {};
    }
    let { traceID } = data;
    traceID = traceID.toLowerCase();

    let traceEndTime = 0;
    let traceStartTime = Number.MAX_SAFE_INTEGER;
    const spanIdCounts = new Map();
    const spanMap = new Map();
    // filter out spans with empty start times
    // eslint-disable-next-line no-param-reassign
    data.spans = data.spans.filter(span => Boolean(span.startTime));

    const max = data.spans.length;
    for (let i = 0; i < max; i++) {
        const span = data.spans[i];
        const { startTime, duration, processID } = span;
        //
        let spanID = span.spanID;
        // check for start / end time for the trace
        if (startTime < traceStartTime) {
            traceStartTime = startTime;
        }
        if (startTime + duration > traceEndTime) {
            traceEndTime = startTime + duration;
        }
        // make sure span IDs are unique
        const idCount = spanIdCounts.get(spanID);
        if (idCount != null) {
            // eslint-disable-next-line no-console
            console.warn(`Dupe spanID, ${idCount + 1} x ${spanID}`, span, spanMap.get(spanID));
            if (_isEqual(span, spanMap.get(spanID))) {
                // eslint-disable-next-line no-console
                console.warn('\t two spans with same ID have `isEqual(...) === true`');
            }
            spanIdCounts.set(spanID, idCount + 1);
            spanID = `${spanID}_${idCount}`;
            span.spanID = spanID;
        } else {
            spanIdCounts.set(spanID, 1);
        }
        span.process = data.processes[processID];
        spanMap.set(spanID, span);
    }
    // tree is necessary to sort the spans, so children follow parents, and
    // siblings are sorted by start time
    const tree = getTraceSpanIdsAsTree(data);
    const spans = [];
    const svcCounts = {};
    let traceName = '';

    tree.walk((spanID, node, depth) => {
        if (spanID === '__root__') {
            return;
        }
        const span = (spanMap.get(spanID));
        if (!span) {
            return;
        }
        const { serviceName } = span.process;
        svcCounts[serviceName] = (svcCounts[serviceName] || 0) + 1;
        if (!span.references || !span.references.length) {
            traceName = `${serviceName}: ${span.operationName}`;
        }
        span.relativeStartTime = span.startTime - traceStartTime;
        span.depth = depth - 1;
        span.hasChildren = node.children.length > 0;
        span.references.forEach(ref => {
            const refSpan = (spanMap.get(ref.spanID));
            if (refSpan) {
                // eslint-disable-next-line no-param-reassign
                ref.span = refSpan;
            }
        });
        spans.push(span);
    });
    const services = Object.keys(svcCounts).map(name => ({ name, numberOfSpans: svcCounts[name] }));
    return {
        services,
        spans,
        traceID,
        traceName,
        // can't use spread operator for intersection types
        // repl: https://goo.gl/4Z23MJ
        // issue: https://github.com/facebook/flow/issues/1511
        processes: data.processes,
        duration: traceEndTime - traceStartTime,
        startTime: traceStartTime,
        endTime: traceEndTime,
    };
};

const getTraceSpanIdsAsTree = (trace) => {
    const nodesById = new Map(trace.spans.map(span => [span.spanID, new TreeNode(span.spanID)]));
    const spansById = new Map(trace.spans.map(span => [span.spanID, span]));
    const root = new TreeNode(TREE_ROOT_ID);
    trace.spans.forEach(span => {
        const node = nodesById.get(span.spanID);
        if (Array.isArray(span.references) && span.references.length) {
            const { refType, spanID: parentID } = span.references[0];
            if (refType === 'CHILD_OF' || refType === 'FOLLOWS_FROM') {
                const parent = nodesById.get(parentID) || root;
                parent.children.push(node);
            } else {
                throw new Error(`Unrecognized ref type: ${refType}`);
            }
        } else {
            root.children.push(node);
        }
    });
    const comparator = (nodeA, nodeB) => {
        const a = spansById.get(nodeA.value);
        const b = spansById.get(nodeB.value);
        return +(a.startTime > b.startTime) || +(a.startTime === b.startTime) - 1;
    };
    trace.spans.forEach(span => {
        const node = nodesById.get(span.spanID);
        if (node.children.length > 1) {
            node.children.sort(comparator);
        }
    });
    root.children.sort(comparator);
    return root;
}


module.exports = transformTraceData;

