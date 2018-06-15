//last edited by GaoZhen at 2018/6/7
//all copyright hold by GaoZhen.
//free to use only for study and research purpose,please contact 1295020109@qq.com for permission on other usage.

// TODO list
// 1.地图初始出现在svg中心位置,需要依据地图坐标中心设置投影中心 project.center()  //done
// 2.依缩放比例(zoom.scale)显示不同细节层次,每次只显示一层  //done
// 3.鼠标点击多边形，相应的区域边界颜色改变，标注也有相应变化//
// 4.在多边形上实现自适应标注
// 5.第五层点击放大聚焦有问题，推测是聚类时交换正六边形单元所致//done


//重新组织后的数据
var whole = new Array();//总体（第一层）
var departments = new Array();//学部
var subjects = new Array();//学科
var sub_disciplines = new Array();//子学科
var programs = new Array();//（个人项目）
var groups = [];//存放所有图层g1,g2,g3,g4,g5
var hierarchy = [whole, departments, subjects, sub_disciplines, programs];//包含一个inUse属性，指示当前鼠标点击的多边形
var orgSvgCenter=[];//初始svg中心
var lastSvgCenter=[];//窗口尺寸改变时的svg中心

window.onload = function () {

    var map_div = document.getElementById("map_div");
    var width = map_div.offsetWidth,  // the width of map div element
        height = map_div.offsetHeight,
        active = d3.select(null),
        current_level = 1,
        current_group = undefined;
    orgSvgCenter=[width/2,height/2];
    lastSvgCenter=[width/2,height/2];

    var projection = d3.geo.mercator()//定义投影
        .scale(140000)//设置缩放量
        .translate([width / 2, height / 2]);　//设置平移量

    var path = d3.geo.path()  //create a path generator
        .projection(projection);　//应用上面生成的投影，每一个坐标都会先调用此投影函数，然后才产生路径值

    //缩放(对象/函数)
    var zoom = d3.behavior.zoom()
        .translate([0, 0])
        .scale(1)
        .scaleExtent([1, 20])
        .on("zoom", zoomed)
    zoom.LOD_valid = true;//默认放大时，会显示更精细的图层。(只在多边形上点击放大居中时不用)

    var svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height);
    // .on("click", stopped, true);  //将svg上的点击事件设置为无效

    var back_rect = svg.append("rect")  //背景矩形，供点击用
        .attr("class", "background")
        .attr("width", width)
        .attr("height", height)
        .on("click", back2browse);

    var btns=positionBtn(orgSvgCenter);
    //复位按钮（回到浏览器打开时的状态）
    btns[0].on('click', function () {
        reset();
        zoom.LOD_valid = true;
    });
    //恢复正常缩放浏览效果按钮
    btns[1].on('click', back2browse)
    // 改变select的值时触发的事件
    $("#selection").change(function () {
        var selectedValue = $("#selection").val(); ////获取选中记录的value值
        selectChangeHandler(selectedValue);
    });

    var g = svg.append("g")
    var g1 = g.append("g");//第一层
    g1.level = 1, g1.id = "g1";
    var g2 = g.append("g");//第二层
    g2.level = 2;
    var g3 = g.append("g");//第三层
    g3.level = 3;
    var g4 = g.append("g");//第四层
    g4.level = 4;
    var g5 = g.append("g");//第五层
    g5.level = 5, g5.id = "g5";
    groups = [g1, g2, g3, g4, g5];

    var detail_g = g.append("g")//点击某个多边形放大后，展示其内部细节的容器

    svg.call(zoom) // delete this line to disable free zooming
        .call(zoom.event);

    var urls = ["http://localhost:8188/data/first2016Z_topo.json",
        "http://localhost:8188/data/second2016Z_topo.json",
        "http://localhost:8188/data/third2016Z_topo.json",
        "http://localhost:8188/data/fourth2016Z_topo.json",
        "http://localhost:8188/data/fifth2016Z_topo.json"];

    //再使用基于多个d3.json读取的数据之前，使用queue.js加载完这些数据再做下一步处理
    queue()
        .defer(d3.json, urls[0])
        .defer(d3.json, urls[1])
        .defer(d3.json, urls[2])
        .defer(d3.json, urls[3])
        .defer(d3.json, urls[4])
        .await(createMap);

    for (var i = 1; i < groups.length; i++) {
        groups[i].style("display", "none");
    }
    //页面加载后执行到上行。。。。。。。。。。。。。。。。。。。。。。。。。。。。


    //鼠标在多边形上的点击事件(mouseup)
    //d和d3中的data有关，而this是按下鼠标时光标所在的dom元素
    function focus(d, current_this) {
        {
            var detailArea = d3.select("#show_detail")   //弹出左侧悬浮区域
                .transition()
                .duration(1000)
                .style("left", 0 + "px")
                .style("opacity", 0.8);

            //先将当前图层所有区域变暗
            current_group = whichGroup(groups);
            current_group.style("opacity", "0.8");
            //获取当前点击时鼠标所在图斑的下一图层内的某一具体图斑
            var hitPolygon = getHitPolygon(current_this);

            zoom.LOD_valid = false;

            var msg = [];
            for (let item in d.properties) {
                let character = e2c(item, current_group.level);
                if (d.properties[item] && character !== "")
                    msg.push(character + ": " + d.properties[item]);
            }
            var detailsUpdate = d3.select("body").select("div").select("#show_detail").select("#detail")
                .selectAll("p")
                .data(msg);

            detailsUpdate.enter()//initialize entering paras
                .append("p")
                .attr("class", "detail")
                .text(function (d) {
                    return d;
                });
            detailsUpdate.exit().remove();

            detailsUpdate
                .attr("class", "detail")
                .text(function (d) {
                    return d;
                })

            if (active.node() === current_this) {
                return back2browse();//在已激活的多边形上再次点击,则恢复到本图层初始状态
            }

            //将上一步激活的多边形恢复
            if (active.node() != null) {
                active.style("fill", active.node().__data__.fillColor);
                active.classed("active", false);
            }

            active = d3.select(current_this).classed("active", true);
            active.style("fill", "#ff4433"); //鼠标点击区域变色

            //放大与对焦
            var bounds = undefined;
            if (parseInt(d.properties.depth) > 4) {
                bounds = getRangeByCoordinates(d.geometry.coordinates[0], hitPolygon.projection);
            }
            else {
                var current_path = d3.geo.path().projection(hitPolygon.projection);//此处的projection要以hitPolygon存储的为准
                bounds = current_path.bounds(d);  //path.bounds(d)
            }
            var dx = Math.abs(bounds[1][0] - bounds[0][0]),
                dy = Math.abs(bounds[1][1] - bounds[0][1]),
                x = (bounds[0][0] + bounds[1][0]) / 2,
                y = (bounds[0][1] + bounds[1][1]) / 2,
                centerX=lastSvgCenter[0],//当前窗口的中心x值
                centerY=lastSvgCenter[1];

            var scale = Math.max(1, Math.min(14, 0.9 / Math.max(dx / (width * 0.8), dy / (height * 0.8)))),
                translate = [centerX - scale * x, centerY - scale * y];
            window.translate = translate;

            //放大后显示细节,首先将上一步放大的内容清空
            detail_g.remove();
            detail_g = g.append("g");

            //获取select标签选中的值
            var selection = d3.select("#selection")[0][0];
            var selectValue = selection.options[selection.selectedIndex].value;
            if (!selectValue) {
                alert("Please choose a property to display.");
            }

            displayDetail(selectValue, detail_g, hitPolygon);//

            //绘制外接矩形
            // detail_g.append("rect")
            //     .data(bounds)
            //     .attr("x",bounds[0][0])
            //     .attr("y",bounds[0][1]<bounds[1][1] ? bounds[0][1]:bounds[1][1])
            //     .attr("width",dx)
            //     .attr("height",dy)
            //     .attr("fill","rgba(255,0,0,0.5)");

            svg.transition()
                .duration(750)
                .call(zoom.translate(translate).scale(scale).event);
        }
    }

    //缩放函数
    function zoomed() {
        g.style("stroke-width", 1.5 / d3.event.scale.toFixed(3) + "px");  //1.5
        g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        document.getElementById("show_scale").innerHTML = "<b>current scale:</b> " + zoom.scale().toFixed(2); //+zoom.LOD_valid

        LOD(zoom.scale(), zoom.LOD_valid);
    }

// If the drag behavior prevents the default click,
// also stop propagation so we don’t click-to-zoom.
    function stopped() {
        if (d3.event.defaultPrevented) d3.event.stopPropagation();
    }


    //读取数据，绘制地图
    function createMap(err, root0, root1, root2, root3, root4) {
        if (err) throw err;
        var roots = [root0, root1, root2, root3, root4];
        for (var i = 0; i < roots.length; i++) {
            var group = groups[i];
            var root = roots[i];
            //将topoJSON对象(root)转换为GeoJSON，保存在geoRoot中.  在绘制地图时，还是使用了GeoJSON对象(坐标为经纬度)。
            var geoRoot = topojson.feature(root, root.objects.collection);//整个geoJson对象，数据在geoRoot.features

            //获取地图范围
            var range = getRangeByFeatures(geoRoot.features);
            //设置地图中心位置（整个地图外接矩形中心（经纬度））
            var center = [(range.min_log + range.max_log) / 2, (range.min_lat + range.max_lat) / 2];
            projection.center(center);
            group.geoCenter = projection(center);//当前图层的外接矩形中心

            //保存当前的投影
            group.projection = d3.geo.mercator().scale(140000).translate([width / 2, height / 2]).center(center);

            group.selectAll("path") //不同的root,对应不同的d3.geo.path  (投影中心不同)
                .data(geoRoot.features)//data对应数据集，复数
                .enter()
                .append("path")
                .attr("d", path)
                .attr("class", function (d) {
                    var currentClass;
                    switch (group.level) {
                        case 1:
                            currentClass = "subunit " + "firstLevel";
                            break;
                        case 2:
                            currentClass = "subunit " + d.properties.name;
                            break;
                        case 3:
                            currentClass = "subunit " + d.properties.parentname;
                            break;
                        case 4:
                            currentClass = "subunit 地球科学部";
                            break;
                        case 5:
                            currentClass = "subunit 地球科学部";
                            break;
                        default:
                            currentClass = "subunit " + "the_last_2_layers";
                    }
                    d.fillColor = polygonFillColor(currentClass);
                    d3.select(this).style("fill", d.fillColor);
                    return currentClass;
                })
                .each(function (d) {
                    reorganize(d, group.projection);//对原数据进行重组织。center
                })
                .on("mouseover", function () {
                    d3.select(this).style("opacity", "0.7");
                    d3.select(this).style("stroke", "#fff");
                  //  d3.select(this).style("stroke-width", "#fff");
                })
                .on("mouseout", function () {
                    d3.select(this).style("opacity", "1");//"fill",d.fillColor
                    d3.select(this).style("stroke", "#eee");
                })
                .on("click", function (d) {  //click mouseup
                    //注意：此处的group.projection并不会随group改变，而一直是最后一个图层的projection
                    focus(d, /*group.projection,*/this);//d和d3中的data有关，而this是按下鼠标时其所在的dom元素
                })
                .append("title")  // 添加tooltip（即鼠标悬浮停留一会，就会显示相关信息）
                .text(function (d) {
                    return d.properties.name
                });


            //各个多边形内部边界,不包括整体的外部轮廓
            // by filtering on a === b or a !== b, we obtain exterior or interior boundaries exclusively.
            group.append("path")
                .datum(topojson.mesh(root, root.objects.collection, function (a, b) {
                    return a !== b;
                }))   //datum 单数
                .attr("class", "polygon_borders")
                .attr("d", path);

            //外部边界
            group.append("path")
                .datum(topojson.mesh(root, root.objects.collection, function (a, b) {
                    return a === b;
                }))
                .attr("class", function () {
                    return i < 4 ? "outlineWithWidth" : "outline";
                })
                .attr("d", path);

            if (i < 3) {
                showPolygonLabel(group, geoRoot.features);  //显示多边形内的标注
            }

            //如果是最后一层，则按项目申请单位将正六边形聚类
            if (i == 4) {
                clusterByOrganization(projection, programs, g5);
            }
        }

        buildNeighbor();
        thematicMap(departments);
    }

//根据缩放倍数显示不同细节图层
    function LOD(scale, valid) {
        var disappear = function () {
            for (var i = 0; i < groups.length; i++) {
                groups[i].style("display", "none");
            }
        }

        if (valid) {
            var scale = scale.toFixed(1);
            if (scale - 1.2 <= 0.1 && scale - 1.2 >= -0.1)  //中间点1.2    范围 1.1-1.3
            {
                disappear();
                g1.style("display", "");
                g1.mScale = 1.2; //记录图层g1显示的中间尺度
                current_level = 1;
            }

            if (scale - 1.5 <= 0.4 && scale - 1.5 >= -0.2)   //范围 1.3-1.9
            {
                disappear();
                g2.style("display", "");
                g2.mScale = 1.5
                current_level = 2;
            }
            if (scale - 2.0 <= 0.7 && scale - 2.0 >= -0.1)   // 1.9-2.7
            {
                disappear();
                g3.style("display", "");
                g3.mScale = 2;
                current_level = 3;
            }
            if (scale - 3.0 <= 2.2 && scale - 3.0 >= -0.3)      // 2.7-5.2
            {
                disappear();
                g4.style("display", "");
                g4.mScale = 3;
                current_level = 4;
            }
            if (scale > 5.2) {
                disappear();
                g5.style("display", "");
                g5.mScale = 5.4;
                current_level = 5;
            }

        }
        else
            return;
    }

//鼠标点击已激活多边形区域或者背景矩形区域，恢复到初始状态
    function reset() {
        //隐藏左侧显示细节面板
        hideDetailPannel();

        var current_group = whichGroup(groups);
        current_group.style("opacity", "1");  //将当前图层的透明度恢复

        detail_g.remove();
        detail_g = g.append("g");

        if (active.node() != null) {
            active.style("fill", active.node().__data__.fillColor);
            active.classed("active", false);
        }

        active = d3.select(null);

        svg.transition()
            .duration(750)
            .call(zoom.translate([ lastSvgCenter[0]-orgSvgCenter[0],lastSvgCenter[1]-orgSvgCenter[1] ]).scale(1).event);
            // .call(zoom.translate([0, 0]).scale(1).event);
    }

    //恢复正常浏览状态
    function back2browse() {
        current_group.style("opacity", "1");
        detail_g.remove();//移除展示细节的图层
        if (active.node() != null) { //恢复处于激活状态的图斑
            active.style("fill", active.node().__data__.fillColor);
            active.classed("active", false);
        }
        else {
            return
        }
        hideDetailPannel();
        zoom.LOD_valid = true;
        active = d3.select(null);

        var scale = current_group.mScale?current_group.mScale:1;
        var centerX=lastSvgCenter[0],centerY=lastSvgCenter[1];

        svg.transition()
            .duration(750)
            .call(zoom.translate([centerX - scale * current_group.geoCenter[0], centerY - scale * current_group.geoCenter[1]]).scale(scale).event);
    }

    //select标签中的值改变触发的事件
    function selectChangeHandler(selectedValue) {
        detail_g.remove();
        detail_g = g.append("g");
        displayDetail(selectedValue, detail_g, hierarchy.inUse);
    }

    //window.onload末尾
}

window.onresize=function () {
    var map_div = document.getElementById("map_div");
    var width = map_div.offsetWidth,
        height = map_div.offsetHeight;

    var svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height);
    var trans=[width/2-orgSvgCenter[0], height/2-orgSvgCenter[1]];
    var g=d3.select("svg").select('g')
        .attr("transform",'translate('+trans[0]+","+trans[1]+")");
    lastSvgCenter=[width/2, height/2];

    positionBtn(lastSvgCenter,false);
}


//阻止浏览器的默认行为
function stopDefault(e) {
    //阻止默认浏览器动作(W3C)
    if (e && e.preventDefault)
        e.preventDefault();
    //IE中阻止函数器默认动作的方式
    else
        window.event.returnValue = false;
    return false;
}

//隐藏左侧显示细节面板
function hideDetailPannel() {
    var width=orgSvgCenter[0]*2;
    var detailArea = d3.select("#show_detail")
        .transition()
        .duration(1000)
        .style("left", -0.2 * width + "px")
        .style("opacity", 0);
}

//为数据不全的图层进行补全操作
function buildNeighbor() {
    //第四图层，即地球科学部
    //获取邻接图斑数据
    var coordinates4=[],subComponents4=[],zxs4=[];
    for(var i=0, len=departments.length;i<len;i++){
        var name=departments[i].properties.name;
        if(name==="工程与材料科学部" || name==="生命科学部" || name==="化学科学部"){
            for(var j=0,l=departments[i].innerPolygons.length;j<l;j++){
                coordinates4.push(departments[i].innerPolygons[j]);
                subComponents4.push(departments[i].subComponents[j])
                zxs4.push(departments[i].subComponents[j].zx);
            }

        }
    }
    var data4=appendPath(coordinates4,subComponents4,zxs4,groups[3]);
    showPolygonLabel(groups[3],data4);

    //第五图层，即测量与地图学、地理信息系统、遥感机理与方法
    //获取邻接图斑数据
    var coordinates5 = [], subComponents5 = [], zxs5=[];
    for (var i = 0, len = subjects.length; i < len; i++) {
        var name0 = subjects[i].properties.name;
        if (name0 === "地理学" || name0 === "地球物理学和空间物理学" || name0 === "地质学") {
            for (var j = 0; j < subjects[i].subComponents.length; j++) {
                var name = subjects[i].subComponents[j].properties.name;
                if (name === "土壤学" || name === "自然资源管理" || name === "区域环境质量与安全" ||
                    name === "污染物行为过程及其环境效应" || name === "古生物学和古生态学" || name === "岩石学" ||
                    name === "沉积学和盆地动力学" || name === "石油天然气地质学" || name === "第四季地质学" ||
                    name === "构造地质学与活动构造" || name === "大地测量学" || name === "地震学" ||
                    name === "地球内部物理学" || name === "地球动力学" || name === "矿物学") {

                    coordinates5.push(subjects[i].innerPolygons[j]);
                    subComponents5.push(subjects[i].subComponents[j]);
                    zxs5.push(subjects[i].subComponents[j].zx);
                }
            }
        }
    }
    var data5=appendPath(coordinates5,subComponents5,zxs5,groups[4]);
    showPolygonLabel(groups[4],data5);
}

//采用专题地图的表达手段来展现相关信息
function thematicMap(departments) {
    var data=[];
    for(var i=0;i<departments.length;i++){
        data.push({
            'pzzzje':departments[i].properties.pzzzje, //批准资助金额
            'pzzzxs':departments[i].properties.pzzzxs, //批准资助项数
            'zx':departments[i].zx
        })
    }

    var jeScale=d3.scale.linear()
        .domain([ d3.min(data, function (d) {return parseInt(d.pzzzje);}),
            d3.max(data, function (d) {return parseInt(d.pzzzje);}) ])
        .range([15,45]);
    var xsScale=d3.scale.linear()
        .domain([ d3.min(data, function (d) {return parseInt(d.pzzzxs);}),
            d3.max(data, function (d) {return parseInt(d.pzzzxs);}) ])
        .range([10,36]);


    groups[1].append('g')
        .selectAll('rect')
        .data(data)
        .enter()
        .append('rect')
        .attr('x',function (d) {
            return groups[1].projection([d.zx.x,d.zx.y])[0];
        })
        .attr('y',function (d) {
            return groups[1].projection([d.zx.x,d.zx.y])[1];
        })
        .attr('width',10)
        .attr('height',function (d) {
            return xsScale(d.pzzzxs);
        })
        .attr('fill',"#00dddd")
        .append("title")
        .text(function (d) {
            return "批准资助项数："+d.pzzzxs;
        });

    groups[1].append('g')
        .selectAll('rect')
        .data(data)
        .enter()
        .append('rect')
        .attr('x',function (d) {
            return groups[1].projection([d.zx.x,d.zx.y])[0]+12;
        })
        .attr('y',function (d) {
            return groups[1].projection([d.zx.x,d.zx.y])[1];
        })
        .attr('width',10)
        .attr('height',function (d) {
            return jeScale(d.pzzzje);
        })
        .attr('fill',"#dd00dd")
        .append("title")
        .text(function (d) {
            return "批准资助金额："+d.pzzzje;
        });


}

//设置复位按钮和下拉列表的位置
function positionBtn(svgCenter) {
    var width=svgCenter[0]*2, height=svgCenter[1]*2;
    var resetBtn = d3.selectAll("#reset")
        .style("position", "absolute")
        .style("left", width - 150 + "px")
        .style("top", Math.round(height / 8) + "px");
    var browseBtn = d3.selectAll("#browse")
        .style("position", "absolute")
        .style("left", width - 150 + "px")
        .style("top", Math.round(height / 8) + 50 + "px");
    var selection = d3.selectAll("#selection")
        .style("position", "absolute")
        .style("left", width - 150 + "px")
        .style("top", Math.round(height / 8) + 100 + "px");

    return [resetBtn,browseBtn];
}









