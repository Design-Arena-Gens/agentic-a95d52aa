'use client'

import { useState, useRef, useEffect, MouseEvent } from 'react'
import styles from './page.module.css'

interface Node {
  id: string
  label: string
  x: number
  y: number
  properties: { key: string; type: string }[]
}

interface Edge {
  id: string
  source: string
  target: string
  label: string
  properties: { key: string; type: string }[]
}

interface DragState {
  nodeId: string
  offsetX: number
  offsetY: number
}

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [connectMode, setConnectMode] = useState<{ sourceId: string } | null>(null)
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  const addNode = () => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      label: `Node ${nodes.length + 1}`,
      x: 400 - viewOffset.x,
      y: 300 - viewOffset.y,
      properties: []
    }
    setNodes([...nodes, newNode])
    setSelectedNode(newNode.id)
    setSelectedEdge(null)
  }

  const deleteNode = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId))
    setEdges(edges.filter(e => e.source !== nodeId && e.target !== nodeId))
    if (selectedNode === nodeId) setSelectedNode(null)
  }

  const deleteEdge = (edgeId: string) => {
    setEdges(edges.filter(e => e.id !== edgeId))
    if (selectedEdge === edgeId) setSelectedEdge(null)
  }

  const updateNodeLabel = (nodeId: string, label: string) => {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, label } : n))
  }

  const updateEdgeLabel = (edgeId: string, label: string) => {
    setEdges(edges.map(e => e.id === edgeId ? { ...e, label } : e))
  }

  const addNodeProperty = (nodeId: string) => {
    setNodes(nodes.map(n =>
      n.id === nodeId
        ? { ...n, properties: [...n.properties, { key: '', type: 'string' }] }
        : n
    ))
  }

  const updateNodeProperty = (nodeId: string, index: number, key: string, type: string) => {
    setNodes(nodes.map(n =>
      n.id === nodeId
        ? {
            ...n,
            properties: n.properties.map((p, i) => i === index ? { key, type } : p)
          }
        : n
    ))
  }

  const removeNodeProperty = (nodeId: string, index: number) => {
    setNodes(nodes.map(n =>
      n.id === nodeId
        ? { ...n, properties: n.properties.filter((_, i) => i !== index) }
        : n
    ))
  }

  const addEdgeProperty = (edgeId: string) => {
    setEdges(edges.map(e =>
      e.id === edgeId
        ? { ...e, properties: [...e.properties, { key: '', type: 'string' }] }
        : e
    ))
  }

  const updateEdgeProperty = (edgeId: string, index: number, key: string, type: string) => {
    setEdges(edges.map(e =>
      e.id === edgeId
        ? {
            ...e,
            properties: e.properties.map((p, i) => i === index ? { key, type } : p)
          }
        : e
    ))
  }

  const removeEdgeProperty = (edgeId: string, index: number) => {
    setEdges(edges.map(e =>
      e.id === edgeId
        ? { ...e, properties: e.properties.filter((_, i) => i !== index) }
        : e
    ))
  }

  const startConnection = (nodeId: string) => {
    setConnectMode({ sourceId: nodeId })
  }

  const finishConnection = (targetId: string) => {
    if (connectMode && connectMode.sourceId !== targetId) {
      const newEdge: Edge = {
        id: `edge-${Date.now()}`,
        source: connectMode.sourceId,
        target: targetId,
        label: 'RELATES_TO',
        properties: []
      }
      setEdges([...edges, newEdge])
    }
    setConnectMode(null)
  }

  const handleNodeMouseDown = (e: MouseEvent, nodeId: string) => {
    e.stopPropagation()
    if (e.shiftKey) {
      if (connectMode) {
        finishConnection(nodeId)
      } else {
        startConnection(nodeId)
      }
    } else {
      const node = nodes.find(n => n.id === nodeId)!
      setDragState({
        nodeId,
        offsetX: e.clientX - node.x,
        offsetY: e.clientY - node.y
      })
      setSelectedNode(nodeId)
      setSelectedEdge(null)
    }
  }

  const handleCanvasMouseDown = (e: MouseEvent) => {
    if (connectMode) {
      setConnectMode(null)
    } else if (e.target === canvasRef.current) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - viewOffset.x, y: e.clientY - viewOffset.y })
      setSelectedNode(null)
      setSelectedEdge(null)
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (dragState) {
      const newX = e.clientX - dragState.offsetX
      const newY = e.clientY - dragState.offsetY
      setNodes(nodes.map(n =>
        n.id === dragState.nodeId ? { ...n, x: newX, y: newY } : n
      ))
    } else if (isPanning) {
      setViewOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setDragState(null)
    setIsPanning(false)
  }

  const exportSchema = () => {
    const schema = { nodes, edges }
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'graph-schema.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importSchema = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const schema = JSON.parse(event.target?.result as string)
          setNodes(schema.nodes || [])
          setEdges(schema.edges || [])
          setSelectedNode(null)
          setSelectedEdge(null)
        } catch (err) {
          alert('Invalid schema file')
        }
      }
      reader.readAsText(file)
    }
  }

  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return { x: 0, y: 0 }
    return { x: node.x + 75, y: node.y + 30 }
  }

  const selectedNodeData = nodes.find(n => n.id === selectedNode)
  const selectedEdgeData = edges.find(e => e.id === selectedEdge)

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h1>Graph Database Designer</h1>
        <div className={styles.buttons}>
          <button onClick={addNode}>+ Add Node</button>
          <button onClick={exportSchema}>Export Schema</button>
          <label className={styles.fileButton}>
            Import Schema
            <input type="file" accept=".json" onChange={importSchema} style={{ display: 'none' }} />
          </label>
        </div>
        <div className={styles.hint}>
          Shift+Click to connect nodes | Drag to move | Click canvas to pan
        </div>
      </div>

      <div className={styles.workspace}>
        <div
          ref={canvasRef}
          className={styles.canvas}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg className={styles.edgeLayer} style={{ transform: `translate(${viewOffset.x}px, ${viewOffset.y}px)` }}>
            {edges.map(edge => {
              const start = getNodeCenter(edge.source)
              const end = getNodeCenter(edge.target)
              const midX = (start.x + end.x) / 2
              const midY = (start.y + end.y) / 2
              const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI

              return (
                <g key={edge.id}>
                  <line
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={selectedEdge === edge.id ? '#ffd700' : '#4a9eff'}
                    strokeWidth={selectedEdge === edge.id ? 3 : 2}
                    markerEnd="url(#arrowhead)"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedEdge(edge.id)
                      setSelectedNode(null)
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <text
                    x={midX}
                    y={midY - 8}
                    fill="#ffffff"
                    fontSize="12"
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {edge.label}
                  </text>
                </g>
              )
            })}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#4a9eff" />
              </marker>
            </defs>
          </svg>

          <div style={{ transform: `translate(${viewOffset.x}px, ${viewOffset.y}px)`, position: 'relative' }}>
            {nodes.map(node => (
              <div
                key={node.id}
                className={`${styles.node} ${selectedNode === node.id ? styles.selected : ''} ${connectMode?.sourceId === node.id ? styles.connecting : ''}`}
                style={{ left: node.x, top: node.y }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              >
                <div className={styles.nodeHeader}>{node.label}</div>
                {node.properties.length > 0 && (
                  <div className={styles.nodeProperties}>
                    {node.properties.map((prop, i) => (
                      <div key={i} className={styles.property}>
                        {prop.key}: {prop.type}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.sidebar}>
          {selectedNodeData && (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h3>Node Properties</h3>
                <button onClick={() => deleteNode(selectedNodeData.id)} className={styles.deleteBtn}>Delete</button>
              </div>
              <div className={styles.field}>
                <label>Label</label>
                <input
                  type="text"
                  value={selectedNodeData.label}
                  onChange={(e) => updateNodeLabel(selectedNodeData.id, e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label>Properties</label>
                {selectedNodeData.properties.map((prop, i) => (
                  <div key={i} className={styles.propertyRow}>
                    <input
                      type="text"
                      placeholder="key"
                      value={prop.key}
                      onChange={(e) => updateNodeProperty(selectedNodeData.id, i, e.target.value, prop.type)}
                    />
                    <select
                      value={prop.type}
                      onChange={(e) => updateNodeProperty(selectedNodeData.id, i, prop.key, e.target.value)}
                    >
                      <option value="string">string</option>
                      <option value="integer">integer</option>
                      <option value="float">float</option>
                      <option value="boolean">boolean</option>
                      <option value="date">date</option>
                    </select>
                    <button onClick={() => removeNodeProperty(selectedNodeData.id, i)} className={styles.removeBtn}>×</button>
                  </div>
                ))}
                <button onClick={() => addNodeProperty(selectedNodeData.id)} className={styles.addBtn}>+ Add Property</button>
              </div>
            </div>
          )}

          {selectedEdgeData && (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h3>Edge Properties</h3>
                <button onClick={() => deleteEdge(selectedEdgeData.id)} className={styles.deleteBtn}>Delete</button>
              </div>
              <div className={styles.field}>
                <label>Label</label>
                <input
                  type="text"
                  value={selectedEdgeData.label}
                  onChange={(e) => updateEdgeLabel(selectedEdgeData.id, e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label>Properties</label>
                {selectedEdgeData.properties.map((prop, i) => (
                  <div key={i} className={styles.propertyRow}>
                    <input
                      type="text"
                      placeholder="key"
                      value={prop.key}
                      onChange={(e) => updateEdgeProperty(selectedEdgeData.id, i, e.target.value, prop.type)}
                    />
                    <select
                      value={prop.type}
                      onChange={(e) => updateEdgeProperty(selectedEdgeData.id, i, prop.key, e.target.value)}
                    >
                      <option value="string">string</option>
                      <option value="integer">integer</option>
                      <option value="float">float</option>
                      <option value="boolean">boolean</option>
                      <option value="date">date</option>
                    </select>
                    <button onClick={() => removeEdgeProperty(selectedEdgeData.id, i)} className={styles.removeBtn}>×</button>
                  </div>
                ))}
                <button onClick={() => addEdgeProperty(selectedEdgeData.id)} className={styles.addBtn}>+ Add Property</button>
              </div>
            </div>
          )}

          {!selectedNodeData && !selectedEdgeData && (
            <div className={styles.panel}>
              <h3>Graph Database Designer</h3>
              <p>Create nodes and relationships to design your graph database schema.</p>
              <ul className={styles.instructions}>
                <li>Click &quot;Add Node&quot; to create a node</li>
                <li>Drag nodes to reposition them</li>
                <li>Shift+Click on two nodes to connect them</li>
                <li>Click nodes/edges to edit properties</li>
                <li>Export/Import JSON schema</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
