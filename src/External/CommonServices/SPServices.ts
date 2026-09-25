/* eslint-disable no-unused-expressions */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/jsx-no-target-blank */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @rushstack/no-new-null */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { SPFI } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/batching";
import "@pnp/sp/attachments";
import "@pnp/sp/fields";
import "@pnp/sp/files";
import "@pnp/sp/folders";
import "@pnp/sp/site-users/web";
import "@pnp/sp/site-groups/web";
import { Web } from "@pnp/sp/webs";
import type { WebPartContext } from "@microsoft/sp-webpart-base";
import {
  IFilter,
  IListItems,
  IListItemUsingId,
  IAddList,
  IUpdateList,
  ISPList,
  IDetailsListGroup,
  ISPAttachment,
  IAttachDelete,
  ISPListChoiceField,
  ISPDocument,
  ISPAddDocument,
  ISPUpdateDocument,
  IDeleteDocument,
  ISPGrpMember,
  IAnotherListItems,
  IAnotherAddList,
  IAnotherUpdateList,
  IAnotherDeleteList,
  IAnotherListItemUsingId,
  IGetDocLibFiles,
  IDocFiles,
  IAddDocLibFiles,
  IInsertFiles,
  IRemoveFiles,
  IAzureUsers,
} from "./ISPServicesProps";
import { MSGraphClient } from "@microsoft/sp-http";
import * as moment from "moment";

let _sp: SPFI;
let _spfxContext: WebPartContext | undefined;

export const setupSP = (sp: SPFI): void => {
  _sp = sp;
};

export const setupSpfxContext = (context: WebPartContext): void => {
  _spfxContext = context;
};

/** Absolute URL of the current SPFx web (e.g. https://tenant.sharepoint.com/sites/ROCA_NPD). */
export const getSpfxWebAbsoluteUrl = (): string => {
  const url = (_spfxContext?.pageContext?.web?.absoluteUrl || "").trim();
  return url.replace(/\/+$/, "");
};

export const getSP = (): SPFI => {
  if (!_sp) {
    throw new Error(
      "SharePoint has not been initialized. Call setupSP() from RocaNpd.tsx first.",
    );
  }
  return _sp;
};

const getAllUsers = async (): Promise<[]> => {
  return (await getSP().web.siteUsers()) as [];
};

const ensureSiteUserId = async (loginNameOrEmail: string): Promise<number> => {
  const trimmed = loginNameOrEmail.trim();
  if (!trimmed) {
    return 0;
  }

  const result = (await getSP().web.ensureUser(trimmed)) as {
    Id?: number;
    data?: { Id?: number };
  };
  return Number(result.Id ?? result.data?.Id) || 0;
};

const SPAddItem = async (params: IAddList): Promise<any> => {
  return await getSP().web.lists
    .getByTitle(params.Listname)
    .items.add(params.RequestJSON);
};

const SPUpdateItem = async (params: IUpdateList): Promise<any> => {
  return await getSP().web.lists
    .getByTitle(params.Listname)
    .items.getById(params.ID)
    .update(params.RequestJSON);
};

const SPDeleteItem = async (params: ISPList): Promise<string> => {
  return await getSP().web.lists
    .getByTitle(params.Listname)
    .items.getById(params.ID)
    .recycle();
};

const SPReadItems = async (params: IListItems): Promise<[]> => {
  params = formatInputs(params);
  const filterValue: string = formatFilterValue(
    params.Filter || [],
    params.FilterCondition ? params.FilterCondition : "",
  );

  let query = getSP()
    .web.lists.getByTitle(params.Listname)
    .items.select(params.Select || "*");

  if (filterValue) {
    query = query.filter(filterValue);
  }
  if (params.Expand) {
    query = query.expand(params.Expand);
  }

  return (await query
    .top(params.Topcount || 0)
    .orderBy(params.Orderby || "ID", params.Orderbydecorasc)()) as [];
};

const SPReadItemUsingId = async (params: IListItemUsingId): Promise<[]> => {
  let query = getSP()
    .web.lists.getByTitle(params.Listname)
    .items.getById(params.SelectedId);

  if (params.Select) {
    query = query.select(params.Select);
  }
  if (params.Expand) {
    query = query.expand(params.Expand);
  }

  return (await query()) as [];
};

const SPAddAttachments = async (params: ISPAttachment) => {
  const files: any[] = params.Attachments;
  const item = getSP().web.lists
    .getByTitle(params.ListName)
    .items.getById(params.ListID);

  const results = [];
  for (const file of files) {
    results.push(await item.attachmentFiles.add(file.name, file.content));
  }
  return results;
};

const SPGetAttachments = async (params: ISPList) => {
  return await getSP().web.lists
    .getByTitle(params.Listname)
    .items.getById(params.ID)
    .attachmentFiles();
};

const SPDeleteAttachments = async (params: IAttachDelete) => {
  return await getSP().web.lists
    .getByTitle(params.ListName)
    .items.getById(params.ListID)
    .attachmentFiles.getByName(params.AttachmentName)
    .delete();
};

const SPGetChoices = async (params: ISPListChoiceField) => {
  return await getSP().web.lists
    .getByTitle(params.Listname)
    .fields.getByInternalNameOrTitle(params.FieldName)();
};

const SPDetailsListGroupItems = async (params: IDetailsListGroup) => {
  type RecordType = { [key: string]: any; indexValue: number };
  const newRecords: RecordType[] = [];
  params.Data.forEach((arr, index) => {
    return newRecords.push({
      Lesson: arr[params.Column],
      indexValue: index,
    });
  });

  const varGroup: { key: any; name: any; startIndex: number; count: number }[] =
    [];
  const UniqueRecords = newRecords.reduce(function (item, e1) {
    const matches = item.filter(function (e2) {
      return e1.Lesson === e2.Lesson;
    });

    if (matches.length == 0) {
      item.push(e1);
    }
    return item;
  }, [] as RecordType[]);

  UniqueRecords.forEach((ur) => {
    const recordLength = newRecords.filter((arr) => {
      return arr.Lesson == ur.Lesson;
    }).length;
    varGroup.push({
      key: ur.Lesson,
      name: ur.Lesson,
      startIndex: ur.indexValue,
      count: recordLength,
    });
  });
  return varGroup;
};

const batchInsert = async (params: {
  ListName: string;
  responseData: any[];
}): Promise<void> => {
  const [batchedWeb, execute] = getSP().web.batched();
  const list = batchedWeb.lists.getByTitle(params.ListName);

  for (const data of params.responseData) {
    list.items.add(data);
  }

  await execute();
};

const batchUpdate = async (params: {
  ListName: string;
  responseData: any[];
}): Promise<void> => {
  const [batchedWeb, execute] = getSP().web.batched();
  const list = batchedWeb.lists.getByTitle(params.ListName);

  for (const data of params.responseData) {
    const itemId = Number(data.ID ?? data.Id ?? data.id);
    const rest = { ...data };
    delete rest.ID;
    delete rest.Id;
    delete rest.id;
    list.items.getById(itemId).update(rest);
  }

  await execute();
};

const batchDelete = async (params: {
  ListName: string;
  responseData: any[];
}): Promise<void> => {
  const [batchedWeb, execute] = getSP().web.batched();
  const list = batchedWeb.lists.getByTitle(params.ListName);

  for (const data of params.responseData) {
    list.items.getById(data.ID).recycle();
  }

  await execute();
};

const batchMutate = async (params: {
  ListName: string;
  insert?: any[];
  update?: any[];
  remove?: { ID: number }[];
}): Promise<void> => {
  const toDelete = params.remove ?? [];
  const toUpdate = params.update ?? [];
  const toInsert = params.insert ?? [];

  if (!toDelete.length && !toUpdate.length && !toInsert.length) {
    return;
  }

  const [batchedWeb, execute] = getSP().web.batched();
  const list = batchedWeb.lists.getByTitle(params.ListName);

  toDelete.forEach((row) => {
    list.items.getById(Number(row.ID)).recycle();
  });
  toUpdate.forEach((row) => {
    const id = Number(row.ID ?? row.Id ?? row.id);
    const rest = { ...row };
    delete rest.ID;
    delete rest.Id;
    delete rest.id;
    list.items.getById(id).update(rest);
  });
  toInsert.forEach((data) => {
    list.items.add(data);
  });

  await execute();
};

const formatInputs = (data: IListItems): IListItems => {
  !data.Select ? (data.Select = "*") : "";
  !data.Topcount ? (data.Topcount = 5000) : "";
  !data.Orderby ? (data.Orderby = "ID") : "";
  !data.Expand ? (data.Expand = "") : "";
  data.Orderbydecorasc !== true && data.Orderbydecorasc !== false
    ? (data.Orderbydecorasc = true)
    : (data.Orderbydecorasc = false);
  !data.PageCount ? (data.PageCount = 10) : "";
  !data.PageNumber ? (data.PageNumber = 1) : "";

  return data;
};

const formatFilterValue = (
  params: IFilter[],
  filterCondition: string,
): string => {
  let strFilter: string = "";
  if (params) {
    for (let i = 0; i < params.length; i++) {
      if (params[i].FilterKey) {
        if (i != 0) {
          if (filterCondition == "and" || filterCondition == "or") {
            strFilter += " " + filterCondition + " ";
          } else {
            strFilter += " and ";
          }
        }

        if (
          params[i].Operator.toLocaleLowerCase() == "eq" ||
          params[i].Operator.toLocaleLowerCase() == "ne" ||
          params[i].Operator.toLocaleLowerCase() == "gt" ||
          params[i].Operator.toLocaleLowerCase() == "lt" ||
          params[i].Operator.toLocaleLowerCase() == "ge" ||
          params[i].Operator.toLocaleLowerCase() == "le"
        ) {
          const key = String(params[i].FilterKey || "");
          const value = String(params[i].FilterValue ?? "");
          // SharePoint Int32 keys (Id/ID) reject quoted literals: use Id eq 53 not Id eq '53'
          const isNumericIdKey =
            /^id$/i.test(key) && /^-?\d+(\.\d+)?$/.test(value.trim());
          strFilter +=
            key +
            " " +
            params[i].Operator +
            " " +
            (isNumericIdKey ? value.trim() : "'" + value + "'");
        } else if (params[i].Operator.toLocaleLowerCase() == "substringof")
          strFilter +=
            params[i].Operator +
            "('" +
            params[i].FilterValue +
            "','" +
            params[i].FilterKey +
            "')";
      }
    }
  }
  return strFilter;
};

const SPReadDocumentItems = async (params: ISPDocument) => {
  const tempData: any[] = [];

  const folders: any = await getSP().web
    .getFolderByServerRelativePath(params.DocumentName)
    .folders();
  tempData.push({ Folders: folders });

  const files = await getSP().web
    .getFolderByServerRelativePath(params.DocumentName)
    .files.select(params.Select)
    .expand(params.Expand)();
  tempData.push({ AllData: files });

  return tempData;
};

const SPAddDocumentItem = async (params: ISPAddDocument) => {
  const fileInfo = await getSP().web
    .getFolderByServerRelativePath(params.DocumentName)
    .files.addUsingPath(params.FileName, params.FileContent);

  const file = getSP().web.getFileByServerRelativePath(fileInfo.ServerRelativeUrl);
  const item = await file.getItem();
  await item.update(params.ColumnNames as Record<string, any>);
};

const SPUpdateDocumentItem = async (params: ISPUpdateDocument) => {
  const file = getSP().web.getFileByServerRelativePath(params.ServerUrl);
  await file.setContent(params.FileContent);
  const item = await file.getItem();
  return await item.update(params.UpdateData);
};

const SPDeleteDocumentItem = async (params: IDeleteDocument) => {
  await getSP().web.lists
    .getByTitle(params.DocumentName)
    .items.getById(params.ID)
    .delete();
};

const getSPGroupMember = async (params: ISPGrpMember): Promise<[]> => {
  return (await getSP().web.siteGroups.getByName(params.GroupName).users()) as [];
};

const AnotherformatInputs = (data: IAnotherListItems): IAnotherListItems => {
  !data.Select ? (data.Select = "*") : "";
  !data.Topcount ? (data.Topcount = 5000) : "";
  !data.Orderby ? (data.Orderby = "ID") : "";
  !data.Expand ? (data.Expand = "") : "";
  data.Orderbydecorasc !== true && data.Orderbydecorasc !== false
    ? (data.Orderbydecorasc = true)
    : "";
  !data.PageCount ? (data.PageCount = 10) : "";
  !data.PageNumber ? (data.PageNumber = 1) : "";
  return data;
};

const getAnotherSPSiteUserEmailMap = async (
  siteUrl: string,
): Promise<Map<number, string>> => {
  const web = Web([getSP().web, siteUrl]);
  const rows = (await web.siteUsers.select("Id,Email")()) as Array<{
    Id?: number;
    Email?: string;
  }>;

  const emailById = new Map<number, string>();

  rows.forEach((user) => {
    const id = Number(user.Id);
    const email = String(user.Email ?? "")
      .trim()
      .toLowerCase();

    if (id > 0 && email) {
      emailById.set(id, email);
    }
  });

  return emailById;
};

const getAnotherSPReadItems = async (
  params: IAnotherListItems,
): Promise<[]> => {
  const web = Web([getSP().web, params.SiteUrl]);

  params = AnotherformatInputs(params);
  const filterValue: string = formatFilterValue(
    params.Filter || [],
    params.FilterCondition ? params.FilterCondition : "",
  );

  let query = web.lists.getByTitle(params.Listname).items.select(
    ...String(params.Select || "*")
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean),
  );

  if (filterValue) {
    query = query.filter(filterValue);
  }

  if (params.Expand) {
    const expandFields = params.Expand.split(",")
      .map((field) => field.trim())
      .filter(Boolean);

    if (expandFields.length) {
      query = query.expand(...expandFields);
    }
  }

  const orderAscending =
    params.Orderbydecorasc === false ? false : Boolean(params.Orderbydecorasc);

  return (await query
    .top(params.Topcount || 5000)
    .orderBy(params.Orderby || "ID", orderAscending)()) as [];
};

const AnotherSPAddItem = async (params: IAnotherAddList): Promise<any> => {
  const web = Web([getSP().web, params.SiteUrl]);

  return await web.lists
    .getByTitle(params.Listname)
    .items.add(params.RequestJSON);
};

const AnotherSPUpdateItem = async (
  params: IAnotherUpdateList,
): Promise<any> => {
  const web = Web([getSP().web, params.SiteUrl]);

  return await web.lists
    .getByTitle(params.Listname)
    .items.getById(params.ID)
    .update(params.RequestJSON);
};

const AnotherSPDeleteItem = async (
  params: IAnotherDeleteList,
): Promise<void> => {
  const web = Web([getSP().web, params.SiteUrl]);

  await web.lists.getByTitle(params.Listname).items.getById(params.ID).delete();
};

const AnotherSPReadItemUsingId = async (
  params: IAnotherListItemUsingId,
): Promise<object> => {
  const web = Web([getSP().web, params.SiteUrl]);
  !params.Select ? (params.Select = "") : params.Select;
  !params.Expand ? (params.Expand = "") : params.Expand;
  return await web.lists
    .getByTitle(params.Listname)
    .items.getById(params.SelectedId)
    .select(params.Select)
    .expand(params.Expand)();
};

const getDocLibFiles = async (params: IGetDocLibFiles): Promise<object[]> => {
  const FilesArr: IDocFiles[] = [];
  try {
    const DocRes = await getSP().web
      .getFolderByServerRelativePath(params.FilePath)
      .files();
    if (DocRes.length) {
      DocRes.forEach((item: any) => {
        FilesArr.push({
          name: item.Name,
          content: item,
          type: "Inlist",
        });
      });
    }
  } catch (err) {
    console.log(err, "Get Document Library Files");
  }
  return FilesArr;
};

const GetDateFormat = (date: Date | null): string | null => {
  if (!date || isNaN(new Date(date).getTime())) {
    return null;
  }

  return moment.utc(date).format("YYYY-MM-DDTHH:mm:ss[Z]");
};

const addDocLibFiles = async (params: IAddDocLibFiles) => {
  let getFilePath: string = params.FilePath;
  if (params.Datas.length) {
    const delAttachments: IDocFiles[] = params.Datas.filter(
      (files: IDocFiles) => {
        return files.type == "Delete";
      },
    );

    const addAttachments: IDocFiles[] = params.Datas.filter(
      (files: IDocFiles) => {
        return files.type == "New";
      },
    );

    if (params.FolderNames.length) {
      for (let j: number = 0; j < params.FolderNames.length; j++) {
        try {
          const res = await getSP().web
            .getFolderByServerRelativePath(getFilePath)
            .folders.addUsingPath(params.FolderNames[j], true);
          getFilePath = res.ServerRelativeUrl;
          if (j === params.FolderNames.length - 1 && delAttachments.length) {
            for (let k: number = 0; k < delAttachments.length; k++) {
              try {
                await getSP().web
                  .getFolderByServerRelativePath(getFilePath)
                  .files.getByUrl(delAttachments[k].name)
                  .delete();
                if (
                  addAttachments.length &&
                  delAttachments.length - 1 === k
                ) {
                  for (let i: number = 0; i < addAttachments.length; i++) {
                    try {
                      await getSP().web
                        .getFolderByServerRelativePath(getFilePath)
                        .files.addUsingPath(
                          addAttachments[i].name,
                          addAttachments[i].content,
                          { Overwrite: true },
                        );
                    } catch (error) {
                      console.log("Error creating file", error);
                    }
                  }
                }
              } catch (error) {
                console.log("Delete  attachements", error);
              }
            }
          } else if (
            j === params.FolderNames.length - 1 &&
            addAttachments.length
          ) {
            for (let z: number = 0; z < addAttachments.length; z++) {
              try {
                await getSP().web
                  .getFolderByServerRelativePath(getFilePath)
                  .files.addUsingPath(
                    addAttachments[z].name,
                    addAttachments[z].content,
                    { Overwrite: true },
                  );
              } catch (error) {
                console.log("Error creating file", error);
              }
            }
          }
        } catch (err) {
          console.log("creating folder", err);
        }
      }
    } else {
      getFilePath = params.FilePath;
      if (delAttachments.length) {
        for (let i: number = 0; i < delAttachments.length; i++) {
          try {
            await getSP().web
              .getFolderByServerRelativePath(getFilePath)
              .files.getByUrl(delAttachments[i].name)
              .delete();
            if (addAttachments.length && delAttachments.length - 1 === i) {
              for (let j: number = 0; j < addAttachments.length; j++) {
                try {
                  await getSP().web
                    .getFolderByServerRelativePath(getFilePath)
                    .files.addUsingPath(
                      addAttachments[j].name,
                      addAttachments[j].content,
                      { Overwrite: true },
                    );
                } catch (error) {
                  console.log("Error creating file", error);
                }
              }
            }
          } catch (error) {
            console.log("Delete attachements", error);
          }
        }
      } else if (addAttachments.length) {
        for (let i: number = 0; i < addAttachments.length; i++) {
          try {
            await getSP().web
              .getFolderByServerRelativePath(params.FilePath)
              .files.addUsingPath(
                addAttachments[i].name,
                addAttachments[i].content,
                { Overwrite: true },
              );
          } catch (error) {
            console.log("Error creating file", error);
          }
        }
      }
    }
  }
  return getFilePath ? getDocLibFiles({ FilePath: getFilePath }) : [];
};

const fileInsert = (params: IInsertFiles) => {
  if (params.files.length) {
    const insertFile: IDocFiles[] = [...params.data];
    for (let i = 0; i < params.files.length; i++) {
      if (
        ![...insertFile].some((values) => {
          return (
            values.name == params.files[i].name && values.type !== "Delete"
          );
        })
      )
        insertFile.push({
          name: params.files[i].name,
          content: params.files[i],
          type: "New",
        });
    }
    return insertFile;
  }
};

const fileRemove = (params: IRemoveFiles) => {
  const removefiles: IDocFiles[] = [...params.data];
  const item = removefiles[params.index];
  if (item.type == "Inlist") {
    removefiles[params.index] = { ...item, ["type"]: "Delete" };
  } else if (item.type == "New") {
    removefiles.splice(params.index, 1);
  }
  return removefiles;
};

type MSGraphClientFactoryLike = {
  getClient: (version?: string) => Promise<MSGraphClient>;
};

const SendOutlookMail = async (params: {
  to: string[];
  subject: string;
  body: string;
  inlineAttachments?: Array<{
    name: string;
    contentType: string;
    contentBytes: string;
    contentId: string;
  }>;
}): Promise<void> => {
  if (!_spfxContext) {
    throw new Error("SPFx context is not initialized for email.");
  }

  const recipients = params.to
    .map((email) => email.trim())
    .filter((email) => email.includes("@"));

  if (!recipients.length) {
    return;
  }

  const factory =
    _spfxContext.msGraphClientFactory ||
    (_spfxContext as unknown as { _msGraphClientFactory: MSGraphClientFactoryLike })
      ._msGraphClientFactory;

  const client = await factory.getClient("3");
  const attachments = (params.inlineAttachments ?? [])
    .filter((attachment) => attachment.contentBytes)
    .map((attachment) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: attachment.name,
      contentType: attachment.contentType,
      contentBytes: attachment.contentBytes,
      contentId: attachment.contentId,
      isInline: true,
    }));

  await client.api("/me/sendMail").post({
    message: {
      subject: params.subject,
      body: {
        contentType: "HTML",
        content: params.body,
      },
      toRecipients: recipients.map((address) => ({
        emailAddress: { address },
      })),
      ...(attachments.length ? { attachments } : {}),
    },
    saveToSentItems: true,
  });
};

const GetAzureUsers = async (params: IAzureUsers): Promise<any[]> => {
  return await params.Context._msGraphClientFactory
    .getClient()
    .then(async (UsersApi: MSGraphClient) => {
      return await UsersApi.api("Users").top(999).get();
    });
};

const GetAzureUsersGroups = async (params: IAzureUsers): Promise<any[]> => {
  return await params.Context._msGraphClientFactory
    .getClient()
    .then(async (UsersApi: MSGraphClient) => {
      return await UsersApi.api("/groups").top(999).get();
    });
};

const SPReadItemVersionHistory = async (
  params: IListItemUsingId,
): Promise<[]> => {
  return (await getSP()
    .web.lists.getByTitle(params.Listname)
    .items.getById(params.SelectedId)
    .versions.select(params.Select || "*")
    .expand(params.Expand || "")()) as [];
};

const SPDownloadFileBlob = async (serverRelativeUrl: string): Promise<Blob> => {
  return await getSP().web.getFileByServerRelativePath(serverRelativeUrl).getBlob();
};

const GenerateFormatId = (
  prefix: string,
  lastId: string,
  padLength: number,
): string => {
  const currentYear = new Date().getFullYear();

  let lastNumber = 0;
  let lastYear = currentYear;

  if (lastId) {
    const parts = lastId.replace(prefix, "").split("-");
    if (parts.length === 2) {
      lastYear = parseInt(parts[0]);
      lastNumber = parseInt(parts[1]);
    }
  }
  const nextNumber = lastYear === currentYear ? lastNumber + 1 : 1;
  const paddedNumber = String(nextNumber).padStart(padLength, "0");
  return `${prefix}${currentYear}-${paddedNumber}`;
};

export default {
  getAllUsers,
  ensureSiteUserId,
  getSpfxWebAbsoluteUrl,
  SPAddItem,
  GetDateFormat,
  GenerateFormatId,
  SendOutlookMail,
  SPUpdateItem,
  SPDeleteItem,
  SPReadItems,
  SPDetailsListGroupItems,
  SPGetChoices,
  SPAddAttachments,
  SPGetAttachments,
  SPDeleteAttachments,
  SPReadItemUsingId,
  batchInsert,
  batchUpdate,
  batchDelete,
  batchMutate,
  SPReadDocumentItems,
  SPAddDocumentItem,
  SPUpdateDocumentItem,
  SPDeleteDocumentItem,
  getSPGroupMember,
  getAnotherSPReadItems,
  getAnotherSPSiteUserEmailMap,
  AnotherSPAddItem,
  AnotherSPUpdateItem,
  AnotherSPDeleteItem,
  AnotherSPReadItemUsingId,
  getDocLibFiles,
  addDocLibFiles,
  fileInsert,
  fileRemove,
  GetAzureUsers,
  GetAzureUsersGroups,
  SPReadItemVersionHistory,
  SPDownloadFileBlob,
  getSP,
};
