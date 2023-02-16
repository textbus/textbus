export const isWindows = () => /win(dows|32|64)/i.test(navigator.userAgent)
export const isMac = () => /mac os/i.test(navigator.userAgent)
export const isSafari = () => /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
export const isFirefox = () => /Firefox/.test(navigator.userAgent)

export const isMobileBrowser = () => /Android|iPhone|iPad/.test(navigator.userAgent)
