export interface Dataroom {
  id: string
  name: string
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

interface NodeBase {
  id: string
  dataroomId: string
  parentId: string | null // null = top-level within the dataroom
  name: string
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

export interface FolderNode extends NodeBase {
  type: 'folder'
}

export interface FileNode extends NodeBase {
  type: 'file'
  mimeType: 'application/pdf'
  size: number // bytes
  blobKey: string // key used to retrieve the PDF Blob from IndexedDB
}

export type DataroomNode = FolderNode | FileNode

/** Typed error thrown by store mutations */
export class DataroomError extends Error {
  readonly code:
    | 'BLANK_NAME'
    | 'NAME_COLLISION'
    | 'INVALID_FILE_TYPE'
    | 'NOT_FOUND'

  constructor(
    code: 'BLANK_NAME' | 'NAME_COLLISION' | 'INVALID_FILE_TYPE' | 'NOT_FOUND',
    message: string,
  ) {
    super(message)
    this.name = 'DataroomError'
    this.code = code
  }
}
