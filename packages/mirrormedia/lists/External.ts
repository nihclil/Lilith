import { utils } from '@mirrormedia/lilith-core'
import { list } from '@keystone-6/core'
import { select, text, timestamp, relationship } from '@keystone-6/core/fields'
import envVar from '../environment-variables'

const { allowRoles, admin, moderator } = utils.accessControl

enum UserRole {
  Admin = 'admin',
  Moderator = 'moderator',
  Editor = 'editor',
  Contributor = 'contributor',
}

enum ExternalStatus {
  Published = 'published',
  Draft = 'draft',
  Scheduled = 'scheduled',
  Archived = 'archived',
  Invisible = 'invisible',
}

type Session = {
  data: {
    id: string
    role: UserRole
  }
}

function filterExternals(roles: string[]) {
  return ({ session }: { session: Session }) => {
    switch (envVar.accessControlStrategy) {
      case 'gql': {
        // Expose `published` and `invisible` externals
        return {
          state: { in: [ExternalStatus.Published, ExternalStatus.Invisible] },
        }
      }
      case 'preview': {
        // Expose all externals, including `published`, `draft` and `archived` externals
        return true
      }
      case 'cms':
      default: {
        // Expose all externals, including `published`, `draft` and `archived` externals if user logged in
        return roles.indexOf(session?.data?.role) > -1
      }
    }
  }
}

const listConfigurations = list({
  fields: {
    slug: text({
      label: 'slug',
      isIndexed: 'unique',
      validation: { isRequired: true },
    }),
    partner: relationship({
      ref: 'Partner',
      ui: {
        hideCreate: true,
      },
    }),
    title: text({
      label: '標題',
      validation: { isRequired: true },
    }),
    state: select({
      label: '狀態',
      options: [
        { label: '草稿', value: 'draft' },
        { label: '已發布', value: 'published' },
        { label: '預約發佈', value: 'scheduled' },
        { label: '下線', value: 'archived' },
        { label: '前台不可見', value: 'invisible' },
      ],
      defaultValue: 'draft',
      isIndexed: true,
    }),
    publishedDate: timestamp({
      label: '發佈日期',
      isIndexed: true,
    }),
    publishedDateString: text({
      label: '發布日期',
      ui: {
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'hidden',
        },
      },
    }),
    extend_byline: text({
      label: '作者',
      validation: { isRequired: false },
    }),
    thumb: text({
      label: '圖片網址',
      validation: { isRequired: false },
    }),
    thumbCaption: text({
      label: '首圖圖說',
      isFilterable: false,
      validation: { isRequired: false },
    }),
    brief: text({
      label: '前言',
      ui: { displayMode: 'textarea' },
    }),
    content: text({
      label: '內文',
      ui: { displayMode: 'textarea' },
    }),
    source: text({
      label: '原文網址',
      validation: { isRequired: false },
    }),
    tags: relationship({
      label: '標籤',
      ref: 'Tag.externals',
      many: true,
      ui: {
        views: './lists/views/sorted-relationship/index',
      },
    }),
    relateds: relationship({
      label: '相關內部文章',
      ref: 'Post.from_External_relateds',
      many: true,
      ui: {
        views: './lists/views/sorted-relationship/index',
      },
    }),
    groups: relationship({
      label: "群組",
      ref: 'Group.externals',
      many: true,
      ui: {
        views: './lists/views/sorted-relationship/index',
      },
    }),
  },
  ui: {
    labelField: 'title',
    listView: {
      initialColumns: ['id', 'title', 'slug', 'partner', 'publishedDateString'],
      initialSort: { field: 'id', direction: 'DESC' },
      pageSize: 50,
    },
  },
  access: {
    operation: {
      update: allowRoles(admin, moderator),
      create: allowRoles(admin, moderator),
      delete: allowRoles(admin),
    },
    filter: {
      query: filterExternals([
        UserRole.Admin,
        UserRole.Moderator,
        UserRole.Editor,
      ]),
    },
  },
  hooks: {
    beforeOperation: async ({ operation, resolvedData }) => {
      /* ... */
      if (operation === 'create' || operation === 'update') {
        if (resolvedData.publishedDate) {
          resolvedData.publishedDateString = new Date(
            resolvedData.publishedDate
          ).toLocaleDateString('zh-TW', {
            timeZone: 'Asia/Taipei',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
          return
        }
      }
      return 0
    },
  },
})
export default utils.addTrackingFields(listConfigurations)
