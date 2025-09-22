export type Point = { x: number; y: number }

export type GraphParam = {
  name: string
  default: number
  min: number
  max: number
}

export type GraphProps = {
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
