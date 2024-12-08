'use strict';
var edgar = {};
edgar.base64DecodeUnicode = function (str) {
    // Convert Base64 encoded bytes to percent-encoding, and then get the original string.
    let percentEncodedStr = atob(str)
        .split('')
        .map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('');
    return decodeURIComponent(percentEncodedStr);
};

edgar.ds2Table = function (rows, headers) {
    var rownum = 1;
    if (!headers) {
        if (rows[0]) {
            headers = Object.keys(rows[0]);
        } else {
            return;
        }
    }
    return `<div class="table-responsive">
            <table class="table table-sm table-hover edgar">
              <thead>
                <tr>
                    <th>#</th>
                    ${headers.map((x) => '<th>' + x + '</th>').join('')}
                </tr>
              </thead>
            <tbody>
              ${rows
            .map(
                (row, i) =>
                    '<tr><th scope="row">' +
                    (i + 1) +
                    '</th>' +
                    Object.keys(row)
                        .map((key) => '<td>' + row[key] + '</td>')
                        .join('') +
                    '</tr>'
            )
            .join('\n')}
            </tbody>
          </table>
        </div>`;
};

edgar.json2Table = function (data) {
    var html =
        '<pre>Rowcount:' +
        data.rowCount +
        '</pre><table class="table table-striped edgar"><tr><td class="edgar-code">#</td>';
    var columns = [];
    var i, c;
    if (data.rowCount > 0) {
        for (c = 0; c < data.fields.length; ++c) {
            html += '<td class="edgar-code">' + data.fields[c].name + '</td>';
        }
        html += '</tr>';
        i = 0;
        data.rows.forEach(function (row) {
            html += '<tr><td class="edgar-code">' + ++i + '</td>';
            for (c = 0; c < data.fields.length; ++c) {
                html += '<td class="edgar-code">' + row['C' + c] + '</td>';
            }
            html += '</tr>';
        });
    }
    html += '</table>';
    return html;
};
edgar.json2Table2 = function (data, id, additionalInfo) {
    var html = `<pre>Rowcount:${data.rowCount} ${additionalInfo || ''
        }</pre><table id="' + id + '" class="table table-striped edgar"><thead><tr><th class="edgar-code">#</th>`;
    var columns = [];
    var i, c;
    if (data.rowCount > 0) {
        for (c = 0; c < data.fields.length; ++c) {
            html += '<th class="edgar-code">' + data.fields[c].name + '</th>';
        }
        html += '</tr></thead><tbody>';
        i = 0;
        data.rows.forEach(function (row) {
            html += '<tr><th class="edgar-code">' + ++i + '</th>';
            for (c = 0; c < data.fields.length; ++c) {
                html += '<td class="edgar-code">' + row['C' + c] + '</td>';
            }
            html += '</tr>';
        });
    }
    html += '</tbody></table>';
    return html;
};

edgar.getColorForPercentage = function (pct) {
    var percentColors = [
        { pct: 0.0, color: { r: 0xff, g: 0x00, b: 0 } },
        { pct: 0.5, color: { r: 0xff, g: 0xff, b: 0 } },
        { pct: 1.0, color: { r: 0x00, g: 0xff, b: 0 } },
    ];

    pct = pct / 100;
    for (var i = 1; i < percentColors.length - 1; i++) {
        if (pct < percentColors[i].pct) {
            break;
        }
    }
    var lower = percentColors[i - 1];
    var upper = percentColors[i];
    var range = upper.pct - lower.pct;
    var rangePct = (pct - lower.pct) / range;
    var pctLower = 1 - rangePct;
    var pctUpper = rangePct;
    var color = {
        r: Math.floor(lower.color.r * pctLower + upper.color.r * pctUpper),
        g: Math.floor(lower.color.g * pctLower + upper.color.g * pctUpper),
        b: Math.floor(lower.color.b * pctLower + upper.color.b * pctUpper),
    };
    return 'rgb(' + [color.r, color.g, color.b].join(',') + ')';
};

// comment out on winter decorations
setInterval(function () {
    $('img[src="/images/edgar75.png"]').prop('src', '/images/edgar75blink.gif');
    setTimeout(() => {
        $('img[src="/images/edgar75blink.gif"]').prop('src', '/images/edgar75.png');
    }, 500);
}, Math.floor(Math.random() * 60000 + 20000));

edgar.showConfirmDialog = function (text, yesHandler, noHandler, title) {
    Swal.fire({
        title: '<strong>' + title + '</strong>',
        html: text,
        showCloseButton: true,
        showCancelButton: true,
        focusConfirm: true,
        confirmButtonText: '<i class="fa fa-thumbs-up"></i> Yes!',
        confirmButtonAriaLabel: 'Yes!',
        cancelButtonText: '<i class="fa fa-thumbs-down"></i> No',
        cancelButtonAriaLabel: 'No',
    }).then((result) => {
        // this result object does NOT behave as in the docs?
        if (result.value && yesHandler) {
            yesHandler();
        } else if (noHandler) {
            noHandler();
        }
    });
};
edgar.showInfoDialog = function (text, okHandler, title) {
    Swal.fire({
        title: '<strong>' + title + '</strong>',
        html: text,
        showCloseButton: false,
        showCancelButton: false,
        focusConfirm: true,
        confirmButtonText: 'OK',
        confirmButtonAriaLabel: 'OK',
    }).then((result) => {
        // this result object does NOT behave as in the docs?
        if (result.value && okHandler) {
            okHandler();
        }
    });
};
edgar.showInputDialog = function (text, title, okHandler, defValue) {
    Swal.fire({
        title: '<strong>' + title + '</strong>',
        html: text,
        input: 'text',
        inputValue: defValue || '',
        showCancelButton: true,
        confirmButtonText: 'OK',
    }).then((result) => {
        if (result.value && okHandler) {
            okHandler(result.value);
        }
    });
};
edgar.handleStickyToolbars = function () {
    var toolbars = $('.edgar-sticky');
    var toolbarOffsets = {};
    toolbars.each(function (idx) {
        toolbarOffsets[idx] = this.offsetTop;
    });

    function applySticky() {
        toolbars.each(function (idx) {
            if (window.pageYOffset > toolbarOffsets[idx]) {
                this.classList.add('sticky');
            } else {
                this.classList.remove('sticky');
            }
        });
    }
    // Sticky toolbar
    window.onscroll = function () {
        applySticky();
    };
};

edgar.bindMdEnhancers = function () {
    $('div[enhance-md]').each(function (midx, htmlElement) {
        var callback = function (mutationsList, observer) {
            var item = $(htmlElement);
            var matches = item
                .html()
                .match(/(<!--\s*collapse.*-->)((?!\/collapse)[^])*<!--\s*\/collapse\s*-->/gi);
            if (matches && matches.length) {
                var newHtml = item.html();
                matches.forEach(function (val, idx) {
                    var old = val;
                    var header = val.substring(0, val.indexOf('-->') + 3);
                    val = val.replace(header, '');
                    val = val.substring(0, val.lastIndexOf('<!--'));
                    var title = (header.split('title') || [undefined, undefined])[1];
                    if (title) {
                        var idx1 = title.indexOf('"');
                        var idx2 = title.indexOf('"', idx1 + 1);
                        if (idx1 > 0 && idx2 > 0) {
                            title = title.substring(idx1 + 1, idx2);
                        }
                    } else {
                        title = 'Show';
                    }
                    var divid = 'enhance-md-collapse-' + midx + idx;
                    var template =
                        '<button type="button" class="btn btn-success pull-right" data-toggle="collapse" data-target="#' +
                        divid +
                        '">' +
                        title +
                        '</button>' +
                        '<div id="' +
                        divid +
                        '" class="collapse enhance-md-collapse">' +
                        val +
                        '</div>';
                    newHtml = newHtml.replace(old, template);
                });
                item.html(newHtml);
            }
            var matches = item
                .html()
                .match(
                    /(<!--\s*(code-playground).*-->)((?!(code-playground))[^])*<!--\s*\/(code-playground)\s*-->/gi
                );
            if (matches && matches.length) {
                var newHtml = item.html();
                matches.forEach(function (val, idx) {
                    newHtml = newHtml.replace(
                        val,
                        '<div class="d-flex justify-content-center"><img src="/images/playground_placeholder.png"/></div>'
                    );
                });
                item.html(newHtml);
            }
            var matches = item
                .html()
                .match(
                    /(<!--\s*(question|multichoice).*-->)((?!(question|multichoice))[^])*<!--\s*\/(question|multichoice)\s*-->/gi
                );
            if (matches && matches.length) {
                var newHtml = item.html();
                matches.forEach(function (val, idx) {
                    newHtml = newHtml.replace(
                        val,
                        '<div class="d-flex justify-content-center"><img src="/images/multichoice_placeholder.png"/></div>'
                    );
                });
                item.html(newHtml);
            }
            var matches = item
                .html()
                .match(
                    /(<!--\s*(code-question).*-->)((?!(code-question))[^])*<!--\s*\/(code-question)\s*-->/gi
                );
            if (matches && matches.length) {
                var newHtml = item.html();
                matches.forEach(function (val, idx) {
                    newHtml = newHtml.replace(
                        val,
                        '<div class="d-flex justify-content-center"><img src="/images/code_question_placeholder.png"/></div>'
                    );
                });
                item.html(newHtml);
            }
        };
        var observer = new MutationObserver(callback);
        observer.observe(htmlElement, {
            attributes: true,
            childList: true,
            subtree: true,
        });
    });
};

edgar.injectSvgDiagrams = async function (md, counter) {
    if (!counter) counter = 1;
    if (!window.mermaid && counter < 11) {
        console.warn('mermaid not loaded, trying againg in 100ms');
        return new Promise((res) =>
            setTimeout(() => res(edgar.injectSvgDiagrams(md, counter + 1)), 100)
        );
    } else if (!window.mermaid) {
        console.warn('mermaid not loaded, giving up...');
        return md;
    }
    let newMd = md;
    var matches = md.match(
        /(<!--\s*(diagram|inline-diagram).*-->)((?!\/(diagram|inline-diagram))[^])*<!--\s*\/(diagram|inline-diagram)\s*-->/gi
    );
    if (matches && matches.length) {
        for (let i = 0; i < matches.length; i++) {
            try {
                let graphDef = ('' + matches[i])
                    .replace(/(<!--\s*(diagram|inline-diagram).*-->)/gi, '')
                    .replace(/(<!--\s*\/(diagram|inline-diagram).*-->)/gi, '');
                let id = (new Date().getMilliseconds() + '-' + Math.random()).replace('.', '');
                const { svg } = await mermaid.render('graph' + id, graphDef);

                if (matches[i].indexOf('inline-diagram') > 0) {
                    newMd = newMd.replace(matches[i], svg);
                } else {
                    newMd = newMd.replace(
                        matches[i],
                        `<div id="svg${id}" class="mermaid-centered">${svg}</div>`
                    );
                }
            } catch (error) {
                console.error('diagram error', error);
                newMd = newMd.replace(
                    matches[i],
                    `<div class="text-danger border rounded m-3">${error}</div>`
                );
            }
        }
        // matches.forEach(async function (val) {
        // });
    }
    return newMd;
};

edgar.copyToClipboard = function (text) {
    if (window.clipboardData && window.clipboardData.setData) {
        // Internet Explorer-specific code path to prevent textarea being shown while dialog is visible.
        return window.clipboardData.setData('Text', text);
    } else if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
        var textarea = document.createElement('textarea');
        textarea.textContent = text;
        textarea.style.position = 'fixed'; // Prevent scrolling to bottom of page in Microsoft Edge.
        document.body.appendChild(textarea);
        textarea.select();
        try {
            return document.execCommand('copy'); // Security exception may be thrown by some browsers.
        } catch (ex) {
            console.warn('Copy to clipboard failed.', ex);
            return prompt('Copy to clipboard: Ctrl+C, Enter', text);
        } finally {
            document.body.removeChild(textarea);
        }
    }
};

edgar.handleUploadImageButton = () => {
    $('#frmUpload').submit(function (e) {
        var form = $(this);
        e.preventDefault();
        $.ajax({
            url: form.attr('action'),
            type: form.attr('method'),
            cache: false,
            contentType: false,
            processData: false,
            data: new FormData(this),
            success: function (data, status) {
                data.forEach(function (item) {
                    mdTextEditors[0].replaceRange('\n\n' + item, CodeMirror.Pos(mdTextEditors[0].lastLine()));
                });
                edgar.showInfoDialog(
                    'Image uploaded, check the bottom of the text and preview.<br>You can change to position of the image by moving the markup.',
                    () => { },
                    'Image uploaded!'
                );
            },
            error: function (xhr, desc, err) {
                alert('upload failed');
            },
        });
    });
};

edgar.showFullImageOnHover = function () {
    $('div.profilepictiny img')
        .on('mouseenter', function (e) {
            var $t = $(this);
            let offset = $t.offset();
            $('#tinyimage-tooltip')
                .html('<img style="width:150px;" src="' + $t.prop('src') + '" />')
                .stop()
                .fadeTo(300, 1)
                .css({
                    top: offset.top + 20,
                    left: offset.left + 30,
                    'z-index': 1,
                });
        })
        .on('mouseleave', function () {
            $('#tinyimage-tooltip').fadeOut(100);
        });
};

if ($ && $.fn && $.fn.DataTable) {
    $.fn.dataTable.ext.order.intl = function (locales, options) {
        if (window.Intl) {
            var collator = new window.Intl.Collator(locales, options);
            var types = $.fn.dataTable.ext.type;

            delete types.order['string-pre'];
            types.order['string-asc'] = collator.compare;
            types.order['string-desc'] = function (a, b) {
                return collator.compare(a, b) * -1;
            };
        }
    };
}
$(document).ready(function () {
    $(window).on('resize', function () {
        $('.chart').each(function (idx, chart) {
            if (chart && echarts) {
                let instance = echarts.getInstanceByDom(chart);
                if (instance && instance.resize()) {
                    instance.resize();
                }
            }
        });
    });

    if ($.fn.DataTable) {
        $.fn.dataTable.ext.order.intl('hr');
        $('table.edgar')
            .not('.no-dt')
            .each(function () {
                var t = $(this).DataTable({
                    fixedHeader: true,
                    iDisplayLength: 200,
                    lengthMenu: [
                        [50, 100, 200, 500, -1],
                        [50, 100, 200, 500, 'All'],
                    ],
                    columnDefs: [
                        {
                            searchable: false,
                            orderable: false,
                            targets: 0,
                        },
                    ],
                    // , "order": [[ 1, 'asc' ]]
                });

                t.on('order.dt search.dt', function () {
                    t.column(0, { search: 'applied', order: 'applied' })
                        .nodes()
                        .each(function (cell, i) {
                            cell.innerHTML = i + 1;
                        });
                }).draw();
            });
    }
    // all buttons that have this attr defined will undergo confirm procedure (modal dialog)
    $('button[edgar_confirm_text]').click(function (e, from) {
        if (from == null) {
            var btn = $(this);
            e.preventDefault();
            edgar.showConfirmDialog(
                btn.attr('edgar_confirm_text'),
                function () {
                    //var form = btn.length > 0 ? $(btn[0].form) : $();
                    //form.submit();
                    //btn.closest('form').submit();
                    // The above does not work at times, dont know why :(
                    btn.trigger('click', ['Edgar']);
                },
                undefined,
                'Please confirm'
            );
        }
    });
    $('.toggle-accordion').on('click', function () {
        var me = $(this);
        var accordionId = me.attr('accordion-id');
        var accordion = $(accordionId);
        var numPanelOpen = accordion.find('.collapse.show').length;

        //accordion.toggleClass("active");

        if (numPanelOpen == 0) {
            accordion.find('.collapse').collapse('show');
            me.text('Collapse All');
        } else {
            accordion.find('.collapse').collapse('hide');
            me.text('Expand All');
        }
    });
    // Fix CodeMirror "bug" - when CM is in a bootstap tab and initally hidden it does not behave correctly:
    // Have to refresh, otherwise lineNumbers are not displayed correctly:
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        $('.CodeMirror').each(function (i, el) {
            el.CodeMirror.refresh();
        });
    });
    $('.collapse').on('shown.bs.collapse', function (e) {
        $('.CodeMirror').each(function (i, el) {
            el.CodeMirror.refresh();
        });
    });
    edgar.handleStickyToolbars();
    edgar.bindMdEnhancers();
    edgar.handleUploadImageButton();
    edgar.showFullImageOnHover();
});

// $(document).on('angular-ready', function (event) {
//     setTimeout(function () { edgar.bindMdEnhancers(); }, 1000);
// });
//#kristina only
//  parse data recived from executing question into html to show
edgar.json2Cresults = function (data) {
    /*var responseData = {
          results : {
            outputs : [{"number":1,"isExecuted":true,"data":"Hello world! .\n"}],
            executionFail : {}
          },
          error : {}
        };*/
    return '<pre>' + JSON.stringify(data) + '</pre>';
    var html;
    var dataObject = data;
    var defaultErrorMssg =
        'Unable to execute program. Please check for any overlooked mistakes in code.';

    if (dataObject.error) {
        // console.log('dataObject.error = ' + dataObject.error);
        html = '<div class="edgar-code alert alert-danger">' + dataObject.error.message + '</div>';
        return html;
    }

    if (dataObject.results.executionFail) {
        var errText = JSON.stringify(dataObject.results.executionFail);
        // console.log('data.results.executionFail = ' + dataObject.results.executionFail.length);
        if (errText.length <= 2) {
            errText = defaultErrorMssg;
        }
        html = '<pre class="edgar-code alert alert-danger">' + errText + ' </pre>';
        return html;
    }

    html = '<table class="table table-striped edgar"><tr><td class="edgar-code">#</td>';
    html += '<td class="edgar-code">input</td>';
    html += '<td class="edgar-code">output</td>';
    html += '</tr>';

    var outputs = dataObject.results.outputs;
    var inputs = dataObject.inputs;
    // console.log('dataObject : ', dataObject);
    for (var i = 0, len = outputs.length; i < len; i++) {
        // console.log('input : ', outputs[i].input);
        html += '<tr><td class="edgar-code"> ' + (i + 1) + '. </td>';

        html += '<td class="edgar-code">' + outputs[i].input + '</td>';
        // html += '<td class="edgar-code">' + outputs[i].isExecuted + '</td>';
        html += '<td class="edgar-code">' + outputs[i] + '</td>';

        /*if(outputs[i].isExecuted == false){
              html = '<div class="edgar-code alert alert-danger"> '+  outputs[i].data +' </div>';
            }else{
              html = '<div class="edgar-code alert alert-success">'+ outputs[i].data +'</div>';
            }*/

        html += '</tr>';
    }
    html += '</table>';
    return html;
};
