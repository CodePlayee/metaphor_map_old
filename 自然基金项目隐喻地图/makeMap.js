//last edited by GaoZhen at 2018/4/2 
//all copyright hold by GaoZhen.
//free to use for only study and research purpose,please contact 1295020109@qq.com for permission on commercial usage.

// TODO list
// 1.地图初始出现在svg中心位置,需要依据地图坐标中心设置投影中心 project.center()  //done
// 2.依缩放比例(zoom.scale)显示不同细节层次,每次只显示一层  //done
// 3.鼠标点击多边形，相应的区域边界颜色改变，标注也有相应变化 //done
// 4.在多边形上实现自适应标注

//重新组织后的数据
var whole=new Array();//总体（第一层）
var departments=new Array();//学部
var subjects=new Array();//学科
var sub_disciplines=new Array();//子学科
var programs=new Array();//（个人项目）
var groups=[];//存放所有图层g1,g2,g3,g4,g5
var hierarchy=[whole,departments,subjects,sub_disciplines,programs];//包含一个inUse属性，指示当前鼠标点击的多边形


// 说明：我们使用D3虽然导入的是topojson文件，但D3通过将TopoJSON对象转换为GeoJSON再绘制地图，
// 所以实质还是使用GeoJSON对象绘制地图
window.onload=function () {

    var map_div_width=document.getElementById("map_div").offsetWidth,
        map_div_height=document.getElementById("map_div").offsetHeight;
    var width =map_div_width,
        height =map_div_height,
        active = d3.select(null),
        current_level=1;

    var projection = d3.geo.mercator()//定义投影
        .scale(140000)//设置缩放量
        .translate([width / 2, height / 2]);　//设置平移量

    var path = d3.geo.path()  //create a path generator
        .projection(projection);　//应用上面生成的投影，每一个坐标都会先调用此投影函数，然后才产生路径值

    //缩放(对象/函数)
    var zoom = d3.behavior.zoom()
        .translate([0,0])
        .scale(1)
        .scaleExtent([1,20])
        .on("zoom", zoomed)
       zoom.LOD_valid=true;//默认放大时，会显示更精细的图层。(只在多边形上点击放大居中时不用)

    var svg = d3.select("svg")
        .attr("width",map_div_width) //width
        .attr("height",map_div_height) //height
        .on("click", stopped, true);

    svg.append("rect")
        .attr("class", "background")
        .attr("width", map_div_width)
        .attr("height", map_div_height)
        .on("click", reset);

    var g = svg.append("g")
    var g1 = g.append("g");//第一层
    g1.level=1;
    var g2 = g.append("g");//第二层
    g2.level=2;
    var g3 = g.append("g");//第三层
    g3.level=3;
    var g4 = g.append("g");//第四层
    g4.level=4;
    var g5 = g.append("g");//第五层
    g5.level=5;
    groups=[g1,g2,g3,g4,g5];

    var detail_g=g.append("g")//点击某个多边形放大后，展示其内部细节的容器

    svg.call(zoom) // delete this line to disable free zooming
        .call(zoom.event);

    var urls=["http://localhost:8188/data/first2016Z_topo.json",
        "http://localhost:8188/data/second2016Z_topo.json",
        "http://localhost:8188/data/third2016Z_topo.json",
        "http://localhost:8188/data/fourth2016Z_topo.json",
        "http://localhost:8188/data/fifth2016Z_topo.json"];

    //再使用基于多个d3.json读取的数据之前，使用queue.js加载完这些数据再做下一步处理
    queue()
        .defer(d3.json,urls[0])
        .defer(d3.json,urls[1])
        .defer(d3.json,urls[2])
        .defer(d3.json,urls[3])
        .defer(d3.json,urls[4])
        .await(createMap);

    window.data_over=true;
    for(var i=1;i<groups.length;i++){
        groups[i].style("display","none");
    }
    //页面加载后执行到上行。。。。。。。。。。。。。。。。。。。。。。。。。。。。


    //缩放按钮 button
    d3.selectAll('.zoom_bt').on('click', zoomClick);
    //复位按钮
    d3.selectAll('#reset').on('click', function () {
        reset();
        zoom.LOD_valid=true;
    });
    //数据重组织后查看相关统计信息
    d3.select("#reorganize").on('click',function () {
        var min= processedShow(groups,$("#selection").val());
        var msg=" ";
        min.forEach(function (d) { msg+=d+"</br>"; })
        document.getElementById("statistic").innerHTML=msg;
    });
    // 改变select的值时触发的事件
    $("#selection").change(function(){
        var selectedValue=$("#selection").val(); ////获取选中记录的value值
        selectChangeHandler(selectedValue);

        var min= processedShow(groups,$("#selection").val());
        var msg=" ";
        min.forEach(function (d) { msg+=d+"</br>"; })
        document.getElementById("statistic").innerHTML=msg;
    });


    //鼠标在多边形上的点击事件(mouseup)
    //d和d3中的data有关，而this是按下鼠标时光标所在的dom元素
    function focus(d,current_this) {
        {
            zoom.LOD_valid=false;
            //d为鼠标点击所属的多边形对象，有geometry 和properties属性
            //显示多边形的详细信息
            var message="<b>detail:</b>"+"<br/>";
            for(var item in d.properties)
            {
                if(d.properties[item])
                    message +=item+": "+d.properties[item]+"<br/>";
            }
            document.getElementById("detail").innerHTML=message;

            if (active.node() === current_this){
             //   active.style("fill",d.fillColor);
                return reset();//在已激活的多边形上再次点击,则恢复到初始状态
            }

            //将上一步激活的多边形恢复
            if(active.node()!=null){
                active.style("fill",active.node().__data__.fillColor);
                active.classed("active", false);
            }

            active = d3.select(current_this).classed("active", true);
            active.style("fill","#ff4433"); //鼠标点击区域变色

            //放大与对焦
            var bounds = path.bounds(d),
                dx = bounds[1][0] - bounds[0][0],
                dy = bounds[1][1] - bounds[0][1],
                x = (bounds[0][0] + bounds[1][0]) / 2,
                y = (bounds[0][1] + bounds[1][1]) / 2,
                scale = Math.max(1, Math.min(16, 0.9 / Math.max(dx / width, dy / height))),
                //scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / (width*0.7), dy / (height*0.7) ))),//乘以0.7是防止放大得过大
                translate = [width / 2 - scale * x, height / 2 - scale * y];
                window.translate=translate;

            //放大后显示细节
            //首先将上一步放大的内容清空
             detail_g.remove();
             detail_g=g.append("g");

            var hitPolygon=getHitPolygon(current_this);
            //var current_group=whichGroup(groups);
            //获取select标签选中的值
            var selection=d3.select("#selection")[0][0];
            var selectValue=selection.options[selection.selectedIndex].value;
            if(!selectValue){
                alert("Please choose a property to display.");
            }

            displayDetail(selectValue,width,height,detail_g,hitPolygon);

            svg.transition()
                .duration(750)  //750
                .call(zoom.translate(translate).scale(scale).event);
        }
    }


    //缩放函数
    function zoomed() {
        g.style("stroke-width",1.5 / d3.event.scale.toFixed(2) + "px" );  //
        g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        document.getElementById("show_scale").innerHTML="<b>current scale:</b> "+zoom.scale().toFixed(2)+zoom.LOD_valid;

        LOD(zoom.scale(),zoom.LOD_valid);
    }


// If the drag behavior prevents the default click,
// also stop propagation so we don’t click-to-zoom.
    function stopped() {
        if (d3.event.defaultPrevented) d3.event.stopPropagation();
    }


    //缩放按钮点击事件
    function zoomClick() {
        zoom.LOD_valid=true;
        var clicked = d3.event.target,
            direction = 1,
            factor = 0.2,//缩放按钮点击一次增大或减少的倍数
            target_zoom = 1,
            center = [width / 2, height / 2],
            extent = zoom.scaleExtent(),
            translate = zoom.translate(),
            translate0 = [],
            l = [],
            view = {x: translate[0], y: translate[1], k: zoom.scale()};

        d3.event.preventDefault();
        direction = (this.id === 'zoom_in') ? 1 : -1;
        target_zoom = zoom.scale() * (1 + factor * direction);

        if (target_zoom < extent[0] || target_zoom > extent[1]) { return false; }

        translate0 = [(center[0] - view.x) / view.k, (center[1] - view.y) / view.k];
        view.k = target_zoom;
        l = [translate0[0] * view.k + view.x, translate0[1] * view.k + view.y];

        view.x += center[0] - l[0];
        view.y += center[1] - l[1];

        interpolateZoom([view.x, view.y], view.k);
    }

    function interpolateZoom (translate, scale) {
        //var self = this;
        return d3.transition().duration(350).tween("zoom", function () {
            var iTranslate = d3.interpolate(zoom.translate(), translate),
                iScale = d3.interpolate(zoom.scale(), scale);
            return function (t) {
                zoom.scale(iScale(t))
                    .translate(iTranslate(t));//相应的zoom属性也要变化

                //此处没有调用zoomed函数
                g.style("stroke-width",1.5 / iScale(t) + "px");
                g.attr("transform", "translate(" + iTranslate(t) + ")scale(" + iScale(t) + ")");

                var show_scale=document.getElementById("show_scale").innerHTML="current scale: "+zoom.scale().toFixed(2);

                LOD(zoom.scale(), zoom.LOD_valid);
            };
        });
    }

    //读取数据，绘制地图
    function createMap(err,root0,root1,root2,root3,root4) {
        if (err) throw err;
        var roots=[root0,root1,root2,root3,root4];
        for(var i=0;i<roots.length;i++){
            var group=groups[i];
            var root=roots[i];
            //将topoJSON对象(root)转换为GeoJSON，保存在geoRoot中.  在绘制地图时，还是使用了GeoJSON对象(坐标为经纬度)。
            var geoRoot = topojson.feature(root,root.objects.collection);//整个geoJson对象，数据在geoRoot.features

            //获取地图范围
            var range=getRangeByFeatures(geoRoot.features);  //geoRoot.features
            //设置地图中心位置（整个地图外接矩形中心（经纬度））
            var center=[(range.min_log+range.max_log)/2,(range.min_lat+range.max_lat)/2];
            projection.center(center);

            group.selectAll("path") //不同的root,对应不同的d3.geo.path  (投影中心不同)
                .data(geoRoot.features )//data对应数据集，复数
                .enter()
                .append("path")
                .attr("d", path)
                .attr("class",function (d) {
                    var currentClass;
                    switch(group.level)
                    {
                        case 1:
                            currentClass="subunit "+"firstLevel";
                            break;
                        case 2:
                            currentClass="subunit "+d.properties.name;
                            break;
                        case 3:
                            currentClass="subunit "+d.properties.parentname;
                            break;
                        default:
                            currentClass="subunit "+"the_last_2_layers";
                    }
                    d.fillColor=polygonFillColor(currentClass);
                    d3.select(this).style("fill",d.fillColor);

                    reorganize(d,center);//对原数据进行重组织。
                    return currentClass;
                })
                .on("mouseover",function () {
                    d3.select(this).style("opacity","0.7");
                    d3.select(this).style("stroke","#fff");
                })
                .on("mouseout",function () {
                    d3.select(this).style("opacity","1");//"fill",d.fillColor
                    d3.select(this).style("stroke","#777");
                })
                .on("mouseup", function (d) {  //click
                    focus(d,this);//d和d3中的data有关，而this是按下鼠标时其所在的dom元素
                })
                .append("title")  // 添加tooltip（即鼠标悬浮停留一会，就会显示相关信息）
                .text(function(d){return d.properties.name});


            //各个多边形内部边界,不包括整体的外部轮廓
            //datum 单数
            // by filtering on a === b or a !== b, we obtain exterior or interior boundaries exclusively.
            group.append("path")
                .datum(topojson.mesh(root,  root.objects.collection, function(a, b) { return a !== b; }))
                .attr("class", "polygon-borders")
                .attr("d", path);

            //外部边界
            group.append("path")
                .datum(topojson.mesh(root,  root.objects.collection, function(a, b) { return a === b; }))
                .attr("class", "out_line")
                .attr("d", path);

            //显示多边形内的标注
            showPolygonLabel(group,geoRoot.features,projection);
           // group.style("display","none");//只绘制，不显示
        }
    }


//根据缩放倍数显示不同细节图层
function LOD(scale,valid)
{
    var layers=[g1,g2,g3,g3,g4,g5];
    var disappear=function () {
        for(var i=0;i<layers.length;i++){
            layers[i].style("display","none");
        }
    }

    if(valid)
    { var scale=scale.toFixed(1);
        if(scale-1.2<=0.1  && scale-1.2>=-0.1)  //临界点1.2    范围 1.1-1.3
        {
            disappear();
            g1.style("display","");
            current_level=1;
        }

        if(scale-1.5<=0.2 && scale-1.5>=-0.2)   //范围 1.3-1.7
        {
            disappear();
            g2.style("display","");
            current_level=2;
        }
        if(scale-2.0<=0.7 && scale-2.0>=-0.3)   // 1.7-2.7
        {
            disappear();
            g3.style("display","");
            current_level=3;
        }
        if(scale-3.0<=2.2 && scale-3.0>=-0.3)      // 2.7-5.2
        {
            disappear();
            g4.style("display","");
            current_level=4;
        }
        if(scale>5.2)
        {
            disappear();
            g5.style("display","");
            current_level=5;
        }

    }
    else
        return;

}

//鼠标点击已激活多边形区域或者背景矩形区域，恢复到初始状态
function reset()
{
        detail_g.remove();
        detail_g=g.append("g");

        if(active.node()!=null){
            active.style("fill",active.node().__data__.fillColor);
            active.classed("active", false);
        }

        active = d3.select(null);

        svg.transition()
            .duration(750)
           .call(zoom.translate([0, 0]).scale(1).event);

    document.getElementById("detail").innerHTML="<b>detail:</b> "+"<br/>"+ "2016年度国家自然基金资助项目统计详情";
    }

//select标签中的值改变触发的事件
function selectChangeHandler(selectedValue) {
    detail_g.remove();
    detail_g=g.append("g");
    displayDetail(selectedValue,width,height,detail_g,hierarchy.inUse);
}

    //window.onload末尾
}








