"use client";

import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import Graph from "@/components/Graph"
import type { GraphParam, Point } from "@/types/graph"
import * as React from "react"

export type GraphAttrs = {
  expression?: string
  data?: Point[]
  domain?: { xMin: number; xMax: number }
  samples?: number
  params?: GraphParam[]
  title?: string
  xLabel?: string
  yLabel?: string
  color?: string
}

const GraphNodeComponent: React.FC<NodeViewProps> = ({ node }) => {
  const attrs: GraphAttrs = (node?.attrs ?? {}) as GraphAttrs
  return (
    <NodeViewWrapper as="div" className="tiptap-graph-node">
      <Graph {...attrs} />
    </NodeViewWrapper>
  )
}

export const GraphNode = Node.create({
  name: "graph",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      expression: { default: null },
      data: { default: null },
      domain: { default: { xMin: -10, xMax: 10 } },
      samples: { default: 200 },
      params: { default: [] },
      title: { default: null },
      xLabel: { default: null },
      yLabel: { default: null },
      color: { default: "#8884d8" },
    }
  },

  parseHTML() {
    // This node primarily serializes via JSON; no specific HTML parsing
    return [
      {
        tag: "graph-node",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["graph-node", mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(GraphNodeComponent)
  },
})
