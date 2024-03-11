import imageLoader from '../../components/images/imageLoader';
import loading from '../../components/loading/loading';
import * as userSettings from '../../scripts/settings/userSettings';
import Events from '../../utils/events.ts';

import '../../elements/emby-itemscontainer/emby-itemscontainer';
import listView from '../../components/listview/listview';

export default function (view, params, tabContent) {
    function getPageData() {
        if (!pageData) {
            pageData = {
                query: {
                    StartIndex: 0,
                    Fields: 'PrimaryImageAspectRatio',
                    groupName: '|BLN| CROATIA'
                }
            };
        }

        if (userSettings.libraryPageSize() > 0) {
            pageData.query['Limit'] = 2000; //userSettings.libraryPageSize();
        }

        return pageData;
    }

    function getQuery() {
        const query = getPageData().query;
        query.groupName = query.groupName.replaceAll('&amp;', '&');
        return query;
    }

    function getChannelsHtml(channels, query) {
        channels = channels.filter(e => {
            return e.ChannelGroup === query.groupName;
        });

        return listView.getListViewHtml({
            items: channels
        });
    }

    function getGroupHtml(groups, queryGroup) {
        let html = '';
        for (const group of groups) {
            const group_button_active = group === queryGroup ? 'group-button-active' : '';
            html +=
                `<div class="vertical-list">
                    <div class="padded-left">
                        <a style="cursor:pointer" class="group-button ${group_button_active} button-flat button-flat-mini">
                            <h2 style="display: inline-block; vertical-align: middle;margin: 0.4em 0">${group}</h2>
                        </a>
                    </div>
                </div>`;
        }
        return html;
    }

    function renderChannels(context, result) {
        function onNextPageClick() {
            if (isLoading) {
                return;
            }

            if (userSettings.libraryPageSize() > 0) {
                query.StartIndex += query.Limit;
            }
            reloadItems(context).then(() => {
                window.scrollTo(0, 0);
            });
        }

        function onPreviousPageClick() {
            if (isLoading) {
                return;
            }

            if (userSettings.libraryPageSize() > 0) {
                query.StartIndex = Math.max(0, query.StartIndex - query.Limit);
            }
            reloadItems(context).then(() => {
                window.scrollTo(0, 0);
            });
        }

        function onGroupButton(e) {
            if (isLoading) {
                return;
            }

            if (userSettings.libraryPageSize() > 0) {
                query.StartIndex = Math.max(0, query.StartIndex - query.Limit);
            }

            const groupName = e.target.innerHTML;
            query.groupName = groupName;

            reloadItems(context).then(() => {
                window.scrollTo(0, 0);
            });
        }

        const query = getQuery();

        // unique groups
        const groupsUnique = new Set();
        for (const item of result.Items) {
            if (item.ChannelGroup) {
                groupsUnique.add(item.ChannelGroup);
            }
        }

        // sort unique groups
        const groups = Array.from(groupsUnique);
        groups.sort();

        const group_html = getGroupHtml(groups, query.groupName);
        const group_elem = context.querySelector('#group');
        group_elem.innerHTML = group_html;
        imageLoader.lazyChildren(group_elem);

        const html = getChannelsHtml(result.Items, query);
        const elem = context.querySelector('#channels');
        elem.innerHTML = html;
        imageLoader.lazyChildren(elem);
        let i;
        let length;
        let elems;

        for (elems = context.querySelectorAll('.btnNextPage'), i = 0, length = elems.length; i < length; i++) {
            elems[i].addEventListener('click', onNextPageClick);
        }

        for (elems = context.querySelectorAll('.btnPreviousPage'), i = 0, length = elems.length; i < length; i++) {
            elems[i].addEventListener('click', onPreviousPageClick);
        }

        for (elems = context.querySelectorAll('.group-button'), i = 0, length = elems.length; i < length; i++) {
            elems[i].addEventListener('click', onGroupButton);
        }
    }

    function showFilterMenu(context) {
        import('../../components/filterdialog/filterdialog').then(({ default: FilterDialog }) => {
            const filterDialog = new FilterDialog({
                query: getQuery(),
                mode: 'livetvchannels',
                serverId: ApiClient.serverId()
            });
            Events.on(filterDialog, 'filterchange', function () {
                reloadItems(context);
            });
            filterDialog.show();
        });
    }

    function reloadItems(context) {
        loading.show();
        isLoading = true;
        const query = getQuery();
        const apiClient = ApiClient;
        query.UserId = apiClient.getCurrentUserId();
        return apiClient.getLiveTvChannels(query).then(function (result) {
            renderChannels(context, result);
            loading.hide();
            isLoading = false;

            import('../../components/autoFocuser').then(({ default: autoFocuser }) => {
                autoFocuser.autoFocus(context);
            });
        });
    }

    let pageData;
    const self = this;
    let isLoading = false;
    tabContent.querySelector('.btnFilter').addEventListener('click', function () {
        showFilterMenu(tabContent);
    });

    self.renderTab = function () {
        reloadItems(tabContent);
    };
}
