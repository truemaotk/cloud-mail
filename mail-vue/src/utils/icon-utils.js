import { getExtName } from '@/utils/file-utils.js'

const attachmentIcons = {
    'file-archive': ['zip', 'rar', '7z', 'tar', 'tgz'],
    'file-image': ['png', 'jpg', 'jpeg', 'gif', 'webp', 'jfif'],
    'file-video': ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'],
    'file-audio': ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a'],
    'file-sheet': ['xls', 'csv', 'xlsx'],
    'file-slides': ['ppt', 'pptx', 'pps', 'potx', 'pot'],
    'file-text': ['txt', 'md', 'ini', 'conf', 'doc', 'docx', 'pdf'],
}

export function getIconByName(filename) {
    const extension = getExtName(filename)
    return Object.keys(attachmentIcons).find(name => attachmentIcons[name].includes(extension)) ?? 'file'
}
