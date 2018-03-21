// TODO list
// 1.地图初始出现在svg中心位置,需要依据地图坐标中心设置投影中心 project.center()  //done
// 2.依缩放比例(zoom.scale)显示不同细节层次,每次只显示一层  //done
// 3.鼠标点击多边形，相应的区域边界颜色改变，标注也有相应变化
// 4.在多边形上实现自适应标注

// 说明：我们使用D3虽然导入的是topojson文件，但D3通过将TopoJSON对象转换为GeoJSON再绘制地图，
// 所以实质还是使用GeoJSON对象绘制地图
window.onload=function () {

    var map_div_width=document.getElementById("map_div").offsetWidth,
        map_div_height=document.getElementById("map_div").offsetHeight;

    var width = 800,
        height =500,
        active = d3.select(null),
        current_level=1,
        LOD_valid=true;//放大是否显示细节(只在多边形上点击放大居中时不用)

    var projection = d3.geo.mercator()//定义投影
        .scale(140000)//设置缩放量
        .translate([width / 2, height / 2]);　//设置平移量

    var path = d3.geo.path()
        .projection(projection);　//应用上面生成的投影，每一个坐标都会先调用此投影函数，然后才产生路径值

    //缩放(对象/函数)
    var zoom = d3.behavior.zoom()
        .translate([0,0])
        .scale(1)
        .scaleExtent([1,12])
        .on("zoom", zoomed);

    var svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("transform", "translate("
            +(map_div_width-width)/2+","
            +(map_div_height-height)/2
            +")")
        .on("click", stopped, true);

    svg.append("rect")
        .attr("class", "background")
        .attr("width", width)
        .attr("height", height)
        .on("click", reset);//clicked

    var g = svg.append("g");//地图图层所在的总group
    var g1 = g.append("g");//第一层
    g1.level=1;
    var g2 = g.append("g");//第二层
    g2.level=2;
    var g3 = g.append("g");//第三层
    g3.level=3;
    var g4 = g.append("g");//第四层
    g4.level=4;
    var g5 = g.append("g");//第五层
    g4.level=5;

    svg.call(zoom) // delete this line to disable free zooming
        .call(zoom.event);

    createMap("http://localhost:8188/data/first2016Z_topo.json",g1);
    createMap("http://localhost:8188/data/second2016Z_topo.json",g2);
    createMap("http://localhost:8188/data/third2016Z_topo.json",g3);
    createMap("http://localhost:8188/data/fourth2016Z_topo.json",g4);
    createMap("http://localhost:8188/data/fifth2016Z_topo.json",g5);
    g1.style("display","inline");

    //缩放按钮 button
    d3.selectAll('.zoom_bt').on('click', zoomClick);
    //复位按钮
    d3.selectAll('#reset').on('click', function () {
        svg.transition()
            .duration(750)
            .call(zoom.translate([0, 0]).scale(1).event);
        LOD_valid=true;
    });

    //鼠标在多边形上的点击事件
    function clicked(d)
    {
        LOD_valid=false;

        //d为鼠标点击所属的多边形对象，有geometry 和properties属性
        //显示多边形的详细信息
        var message="<b>detail:</b>"+"<br/>";
        for(var item in d.properties)
        {
            if(d.properties[item])
            message +=item+": "+d.properties[item]+"<br/>";
        }
        document.getElementById("detail").innerHTML=message;

        if (active.node() === this)
            return reset();//在已激活的多边形上再次点击,则恢复到初始状态
        active.classed("active", false);//将上一步激活的多边形恢复
        active = d3.select(this).classed("active", true);

        //对焦
        var bounds = path.bounds(d),
            dx = bounds[1][0] - bounds[0][0],
            dy = bounds[1][1] - bounds[0][1],
            x = (bounds[0][0] + bounds[1][0]) / 2,
            y = (bounds[0][1] + bounds[1][1]) / 2,
            scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
            translate = [width / 2 - scale * x, height / 2 - scale * y];

        svg.transition()
            .duration(750)
            .call(zoom.translate(translate).scale(scale).event);

    }



    //缩放函数
    function zoomed() {
        g.style("stroke-width", 1.5 / d3.event.scale + "px");
        g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        document.getElementById("show_scale").innerHTML="<b>current scale:</b> "+zoom.scale().toFixed(2);

        LOD(zoom.scale(),LOD_valid);
    }


// If the drag behavior prevents the default click,
// also stop propagation so we don’t click-to-zoom.
    function stopped() {
        if (d3.event.defaultPrevented) d3.event.stopPropagation();
    }


//缩放按钮点击事件
    function zoomClick() {
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
                g.style("stroke-width", 1.5 / iScale(t) + "px");
                g.attr("transform", "translate(" + iTranslate(t) + ")scale(" + iScale(t) + ")");

                var show_scale=document.getElementById("show_scale").innerHTML="current scale: "+zoom.scale().toFixed(2);
                LOD_valid=true;
                LOD(zoom.scale(), LOD_valid);
            };
        });
    }

//读取json数据并在特定<g>标签里显示图形
    function createMap(url,group) {
        d3.json( url,
            function(error, root)
            {
             if (error) throw error;

            //读取成功
            //将topoJSON对象(root)转换为GeoJSON，保存在geoRoot中
            //然而需要注意的是，实际上在绘制地图时，还是使用了GeoJSON对象(坐标为经纬度)。
            //feature方法返回GeoJSON的要素（Feature）或要素集合（FeatureColleciton）
            var geoRoot = topojson.feature(root,root.objects.collection);//整个geoJson对象，数据在geoRoot.features

            //获取地图范围
            var range=getRange(geoRoot.features);  //geoRoot.features
            //设置地图中心位置（整个地图外接矩形中心（经纬度））
            projection.center([(range.min_log+range.max_log)/2,(range.min_lat+range.max_lat)/2]);

            group.selectAll("path") //
                .data(geoRoot.features )//data对应数据集，复数
                .enter()
                .append("path")
                .attr("d", path)
                .attr("class",function (d) {
                    switch(group.level)
                    {
                        case 1:
                            return "subunit "+"firstLevel";
                        case 2:
                            return "subunit "+d.properties.name;
                        case 3:
                            return "subunit "+d.properties.parentname;
                        default:
                            return "the_last_2_layers";  //"subunit "+d.properties.parentname;
                    }
                });
                // .on("click", clicked);


            //内部边界
            //     group.append("path")
            //         //datum 单数
            //     // by filtering on a === b or a !== b, we obtain exterior or interior boundaries exclusively.
            //     .datum(topojson.mesh(root,  root.objects.collection, function(a, b) { return a !== b; }))
            //     .attr("class", "polygon-borders")
            //     .attr("d", path);

                //外部边界
                group.append("path")
                    .datum(topojson.mesh(root,  root.objects.collection, function(a, b) { return a === b; }))
                    .attr("class", "out_line")
                    .attr("d", path);

               //鼠标悬浮作用层
                group.append("g")
                    .attr("class","subjects")  //这个类属性是加给 g 的
                    .selectAll("path")
                    .data(geoRoot.features)
                    .enter()
                    .append("path")
                    .attr("d", path)
                    .attr("id", function (d) {   //某个level下的整体图层（包括各个多边形）
                        return "level"+d.properties.depth;
                    })
                    .on("click", clicked)
					.append("title")  // 添加tooltip（即鼠标悬浮停留一会，就会显示相关信息）
				    .text(function(d){return d.properties.name});

                //显示多边形内的标注
                showPolygonLabel(group,geoRoot.features,projection);
            });
        
        group.style("display","none");//只绘制，不显示
        return group;
    }

//根据缩放倍数显示不同细节图层
function LOD(scale,valid)
{
    if(valid)
    { var scale=scale.toFixed(1);
        if(scale-1.2<=0.1  && scale-1.2>=-0.1)  //临界点1.2    范围 1.1-1.3
        {
            g2.style("display","none");
            g3.style("display","none");
            g4.style("display","none");
            g5.style("display","none");
            g1.style("display","inline");
            current_level=1;
        }
       // if(scale-1.4<=0.1 && scale-1.4>=-0.1 || scale-1.6<=0.1 && scale-1.6>=-0.1)   //临界点1.4 and 1.6
        if(scale-1.5<=0.2 && scale-1.5>=-0.2)   //范围 1.3-1.7
        {
            g1.style("display","none");
            g3.style("display","none");
            g4.style("display","none");
            g5.style("display","none");
            g2.style("display","inline");
            current_level=2;
        }
        if(scale-2.0<=0.7 && scale-2.0>=-0.3)   // 1.7-2.7
        {
            g1.style("display","none");
            g2.style("display","none");
            g4.style("display","none");
            g5.style("display","none");
            g3.style("display","inline");
            current_level=3;
        }
        if(scale-3.0<=0.7 && scale-3.0>=-0.3)      // 2.7-3.7
        {
            g1.style("display","none");
            g2.style("display","none");
            g3.style("display","none");
            g5.style("display","none");
            g4.style("display","inline");
            current_level=4;
        }
        if(scale>3.7)
        {
            g1.style("display","none");
            g2.style("display","none");
            g3.style("display","none");
            g4.style("display","none");
            g5.style("display","inline");
            current_level=5;
        }

    }
    else
        return;

}





    //window.onload末尾
}


//
//鼠标点击已激活多边形区域或者背景矩形区域，恢复到初始状态
function reset()
{// LOD_valid=true;
    active.classed("active", false);
    active = d3.select(null);
    svg.transition()
        .duration(750)
        .call(zoom.translate([0, 0]).scale(1).event);

    document.getElementById("detail").innerHTML="<b>detail:</b> "+"<br/>"+ "2016年度国家自然基金资助项目统计详情";
}

//在多边形内部标注文字 group代表g标签，features代表要素集，projection代表投影
function showPolygonLabel(group,features,projection)
{
    var font_size=8;
    switch (group.level){
        case 1:
            font_size=15;
            break;
        case 2:
            font_size=10;
            break;
        case 3:
            font_size=5;
            break;
        default:
            font_size=2.5;
            break;
    }

    group.selectAll("text")
        .data(features)
        .enter()
        .append("text")
        .attr("x",function (d) {
            var gravityCenter=getGravityCenter(d.geometry.coordinates[0]);//多边形重心，coordinates里的元素是数组
            var projected_zx=projection([gravityCenter.x,gravityCenter.y]);//投影后的重心，返回的是数组[ , ]
            return  projected_zx[0];
        })
        .attr("y",function (d) {
            var gravityCenter=getGravityCenter(d.geometry.coordinates[0]);
            var projected_zx=projection([gravityCenter.x,gravityCenter.y]);
            return  projected_zx[1];
        })
        .attr("class","level"+group.level+"label")
        .style("text-anchor","middle")
        .style("font-size",font_size)
        .text(function (d) { return d.properties.name; });
}
