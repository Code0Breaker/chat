export const hasWebcam = async (): Promise<boolean> => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device=>device.label!=='OBS Virtual Camera').some(device => device.kind === 'videoinput');
};