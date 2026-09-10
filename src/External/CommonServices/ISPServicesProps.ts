export interface IFilter {
  FilterKey: string;
  FilterValue: string;
  Operator: string;
}

export interface IListItems {
  Listname: string;
  Select?: string;
  Topcount?: number;
  Expand?: string;
  Orderby?: string;
  Orderbydecorasc?: boolean;
  Filter?: IFilter[];
  FilterCondition?: string;
  PageCount?: number;
  PageNumber?: number;
}

export interface IAddList {
  Listname: string;
  RequestJSON: object;
}

export interface ISPList {
  Listname: string;
  ID: number;
}

export interface ISPListChoiceField {
  Listname: string;
  FieldName: string;
}

export interface IUpdateList {
  Listname: string;
  RequestJSON: object;
  ID: number;
}

export interface IListItemUsingId {
  Listname: string;
  Select?: string;
  Expand?: string;
  SelectedId: number;
}

export interface IDetailsListGroup {
  Data: any[];
  Column: string;
}

export interface IPeopleObj {
  key: number;
  imageUrl: string;
  text: string;
  secondaryText: string;
  ID: number;
  isValid: boolean;
}

export interface IAttachContents {
  name: string;
  content: [];
}

export interface IAttachDelete {
  ListName: string;
  ListID: number;
  AttachmentName: string;
}

export interface ISPAttachment {
  ListName: string;
  ListID: number;
  Attachments: IAttachContents[];
}

export interface ISPDocument {
  DocumentName: string;
  Select: string;
  Topcount?: number;
  Expand: string;
  Orderby?: string;
  Orderbydecorasc?: boolean;
  Filter?: IFilter[];
  FilterCondition?: string;
}

export interface IDocumentFileContent {
  Name: string;
  Type: string;
  Size: number;
  LastModified: number;
}

export interface ISPAddDocument {
  DocumentName: string;
  FileName: string;
  FileContent: any;
  ColumnNames: Object;
}

export interface IUpdateDataDocument {
  FileLeafRef: string;
}

export interface ISPUpdateDocument {
  ServerUrl: string;
  FileContent: any;
  UpdateData: any;
}

export interface IDeleteDocument {
  DocumentName: string;
  ID: number;
}

export interface ISPGrpMember {
  GroupName: string;
}

export interface IAnotherListItems {
  SiteUrl: string;
  Listname: string;
  Select?: string;
  Topcount?: number;
  Expand?: string;
  Orderby?: string;
  Orderbydecorasc?: boolean;
  Filter?: IFilter[];
  FilterCondition?: string;
  PageCount?: number;
  PageNumber?: number;
}

export interface IAnotherAddList {
  SiteUrl: string;
  Listname: string;
  RequestJSON: object;
}

export interface IAnotherUpdateList {
  SiteUrl: string;
  Listname: string;
  RequestJSON: object;
  ID: number;
}

export interface IAnotherDeleteList {
  SiteUrl: string;
  Listname: string;
  ID: number;
}

export interface IAnotherListItemUsingId {
  SiteUrl: string;
  Listname: string;
  Select?: string;
  Expand?: string;
  SelectedId: number;
}

export interface IDocFiles {
  name: string;
  content: any;
  type: string;
}

export interface IGetDocLibFiles {
  FilePath: string;
}

export interface IAddDocLibFiles {
  FilePath: string;
  FolderNames: string[];
  Datas: IDocFiles[];
}

export interface IInsertFiles {
  data: IDocFiles[];
  files: any[];
}

export interface IRemoveFiles {
  data: IDocFiles[];
  index: number;
}

export interface IAzureUsers {
  Context: string | any;
}
