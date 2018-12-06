function isDirectMode(mode) {
  return (mode === undefined || mode === null || mode === 0)
}

function isRequestMode(mode) {
  return mode === 1
}

export default {
  DIRECT: 0,
  REQUEST: 1,
  isDirectMode,
  isRequestMode,
}
